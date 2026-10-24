// opencode plugin: shared resource locks with a fair FIFO wait queue.
// Options (all optional): dir, checkIntervalMs, staleSec, backfillMaxSec, capacity { name: N }.
import { appendFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { Store, formatStatus, type Owner, type StoreOptions, type WaitResult } from "./store.ts"
import { runHeld } from "./run.ts"

/** opencode stops sessions with no events for 60 min, so one tool call never blocks longer than this. */
export const MAX_WAIT_SEC = 600
const OUTPUT_TAIL = 30_000

type Json = Record<string, unknown>
interface Ctx {
  options?: Json
  location?: { directory?: string }
  tool: { transform(fn: (editor: any) => void): Promise<{ dispose(): Promise<void> }> }
  event?: { subscribe(o: { signal: AbortSignal }): AsyncIterable<unknown> }
}
interface ToolCtx {
  sessionID: string
  signal?: AbortSignal
  progress?: (m: Json) => Promise<void>
}

const s = (description: string, extra: Json = {}) => ({ type: "string", description, ...extra })
const n = (description: string, extra: Json = {}) => ({ type: "number", description, ...extra })
const preconditionsSchema = {
  type: "array",
  description:
    'Checks that must pass before the lock is granted. If one fails, the ticket keeps its place and is checked again. Items: {"kind":"mem_available","min_kb":N,"for_sec":S} or {"kind":"no_process","names":["name",...],"for_sec":S} or {"kind":"no_compiler","for_sec":S} (no compiler, assembler or linker runs; matches versioned names such as clang-22). for_sec: the checks must pass without a break for S seconds.',
  items: { type: "object" },
}
const identity = {
  holder: s("Who holds the lock, e.g. your agent name. With the session ID it identifies the ticket owner."),
  nick: s("Your IRC nick (agent-comms), so other agents can contact the holder."),
}

export function describeResult(r: WaitResult): string {
  const t = r.ticket
  switch (r.status) {
    case "granted":
      return `granted: ticket ${t.id} holds ${t.resource}. Call resource_release when done (max hold ${t.max_hold_sec} s).`
    case "waiting":
      return `waiting: ticket ${t.id}, position ${r.position} for ${t.resource}, estimated wait ${r.eta_sec} s${r.pending_reason ? ` (${r.pending_reason})` : ""}. Call resource_wait with this ticket.`
    default:
      return `${r.status}: ticket ${t.id}${t.end_reason ? ` (${t.end_reason})` : ""}.`
  }
}

function meta(r: WaitResult): Json {
  return { status: r.status, ticket: r.ticket.id, resource: r.ticket.resource, ...(r.status === "waiting" ? { position: r.position, eta_sec: r.eta_sec } : {}) }
}

export function createTools(store: Store, defaults: { cwd?: string } = {}) {
  const owner = (c: ToolCtx, input: Json): Owner => ({ sessionID: c.sessionID, holder: (input.holder as string) ?? null })
  const clampWait = (v: unknown) => Math.min(MAX_WAIT_SEC, Math.max(0, typeof v === "number" ? v : MAX_WAIT_SEC))
  const ownerOf = (c: ToolCtx, ticket: string): Owner => ({ sessionID: c.sessionID, holder: store.ticket(ticket)?.holder ?? null })

  return [
    {
      name: "resource_acquire",
      description:
        'Join the FIFO queue for a shared system resource such as "gpu" or "build". Returns a ticket ID, the queue position and an estimated wait. If the ticket is not granted at once, call resource_wait. Always call resource_release when you are done.',
      input: {
        type: "object",
        properties: {
          resource: s('Resource name, e.g. "gpu" or "build".'),
          ...identity,
          purpose: s("What you use the resource for. It is shown in status and the log."),
          max_hold_sec: n("Longest time you hold the lock. After it the lock is released automatically. A short value (at most 120 s by default) lets the ticket start early, while running holders drain for a waiting exclusive ticket.", { exclusiveMinimum: 0 }),
          exclusive: { type: "boolean", description: "Take all slots of a resource with capacity > 1 (e.g. a quiet host: no builds)." },
          preconditions: preconditionsSchema,
        },
        required: ["resource", "holder", "purpose", "max_hold_sec"],
        additionalProperties: false,
      },
      async execute(input: Json, c: ToolCtx) {
        const r = store.acquire({
          resource: input.resource as string, holder: input.holder as string, nick: (input.nick as string) ?? null,
          purpose: input.purpose as string, max_hold_sec: input.max_hold_sec as number, exclusive: !!input.exclusive,
          preconditions: input.preconditions, session_id: c.sessionID, owner_pid: process.pid,
        })
        return { content: describeResult(r), metadata: meta(r) }
      },
    },
    {
      name: "resource_wait",
      description: `Block until the ticket holds the lock, or until timeout_sec passes (at most ${MAX_WAIT_SEC} s). Returns granted, waiting (with the current position), expired or canceled. On waiting, call it again.`,
      input: {
        type: "object",
        properties: { ticket: s("Ticket ID from resource_acquire."), timeout_sec: n(`Seconds to wait, at most ${MAX_WAIT_SEC}.`, { minimum: 0, maximum: MAX_WAIT_SEC }) },
        required: ["ticket", "timeout_sec"],
        additionalProperties: false,
      },
      async execute(input: Json, c: ToolCtx) {
        const id = input.ticket as string
        const r = await store.wait(id, clampWait(input.timeout_sec), ownerOf(c, id), c.signal)
        return { content: describeResult(r), metadata: meta(r) }
      },
    },
    {
      name: "resource_release",
      description: "Release a lock that you hold, or leave the queue. The next ticket in line gets the lock.",
      input: { type: "object", properties: { ticket: s("Ticket ID.") }, required: ["ticket"], additionalProperties: false },
      async execute(input: Json, c: ToolCtx) {
        const id = input.ticket as string
        const t = store.release(id, ownerOf(c, id))
        return { content: `ticket ${t.id}: ${t.state}${t.end_reason ? ` (${t.end_reason})` : ""}.` }
      },
    },
    {
      name: "resource_cancel",
      description: "Cancel your ticket and leave the queue. Only the owner of the ticket can cancel it.",
      input: { type: "object", properties: { ticket: s("Ticket ID.") }, required: ["ticket"], additionalProperties: false },
      async execute(input: Json, c: ToolCtx) {
        const id = input.ticket as string
        const t = store.cancel(id, ownerOf(c, id))
        return { content: `ticket ${t.id}: ${t.state}${t.end_reason ? ` (${t.end_reason})` : ""}.` }
      },
    },
    {
      name: "resource_status",
      description: "Show the holders, the queue, hold times and recent results for one resource or for all resources.",
      input: { type: "object", properties: { resource: s("Resource name. Omit for all.") }, additionalProperties: false },
      async execute(input: Json) {
        const st = store.status(input.resource as string | undefined)
        const recent = st.flatMap((r) => r.recent.slice(0, 5).map((e) => `  ${r.resource} ${e.at} ${e.event} ${e.ticket} ${e.holder}${e.duration_sec === null ? "" : ` ${e.duration_sec} s`}${e.detail ? ` - ${e.detail}` : ""}`))
        return { content: formatStatus(st) + (recent.length ? `recent:\n${recent.join("\n")}\n` : ""), metadata: { resources: st } }
      },
    },
    {
      name: "resource_run",
      description: `Acquire a resource, run a shell command while you hold it, then release it. Waits at most timeout_sec (at most ${MAX_WAIT_SEC} s) for the lock; if it is not granted, it returns the ticket: call resource_run again with that ticket. Output streams to a log file under the store directory.`,
      input: {
        type: "object",
        properties: {
          resource: s("Resource name."),
          cmd: s("Shell command (run with bash -c)."),
          max_hold_sec: n("Longest run time. The command is stopped (TERM, then KILL after 15 s) after it.", { exclusiveMinimum: 0 }),
          ...identity,
          purpose: s("What the command does. Default: the command."),
          ticket: s("Ticket from an earlier resource_run that returned waiting."),
          timeout_sec: n(`Seconds to wait for the lock, at most ${MAX_WAIT_SEC}.`, { minimum: 0, maximum: MAX_WAIT_SEC }),
          exclusive: { type: "boolean", description: "Take all slots of the resource." },
          preconditions: preconditionsSchema,
          cwd: s("Working directory. Default: the session directory."),
        },
        required: ["resource", "cmd", "max_hold_sec", "holder"],
        additionalProperties: false,
      },
      async execute(input: Json, c: ToolCtx) {
        const who = owner(c, input)
        const maxHold = input.max_hold_sec as number
        let r: WaitResult = input.ticket
          ? store.poll(input.ticket as string, ownerOf(c, input.ticket as string))
          : store.acquire({
              resource: input.resource as string, holder: input.holder as string, nick: (input.nick as string) ?? null,
              purpose: (input.purpose as string) ?? (input.cmd as string).slice(0, 200), max_hold_sec: maxHold + 30,
              exclusive: !!input.exclusive, preconditions: input.preconditions, session_id: c.sessionID, owner_pid: process.pid,
            })
        if (r.status === "waiting") {
          await c.progress?.({ title: `waiting for ${r.ticket.resource}`, ...meta(r) })
          r = await store.wait(r.ticket.id, clampWait(input.timeout_sec), ownerOf(c, r.ticket.id), c.signal)
        }
        if (r.status !== "granted") {
          const again = r.status === "waiting" ? ` Call resource_run again with ticket "${r.ticket.id}".` : ""
          return { content: describeResult(r).replace(/ Call resource_wait.*$/, "") + again, metadata: meta(r) }
        }
        const id = r.ticket.id
        const logDir = join(store.dir, "runs")
        mkdirSync(logDir, { recursive: true })
        const logPath = join(logDir, `${id}.log`)
        let tail = ""
        let last = 0
        try {
          const { code, timedOut } = await runHeld(store, id, ownerOf(c, id), {
            cmd: ["bash", "-c", input.cmd as string],
            maxHoldSec: maxHold,
            cwd: (input.cwd as string) ?? defaults.cwd,
            signal: c.signal,
            onOutput: (chunk) => {
              appendFileSync(logPath, chunk)
              tail = (tail + chunk).slice(-OUTPUT_TAIL)
              if (Date.now() - last > 1000) {
                last = Date.now()
                void c.progress?.({ title: `running on ${r.ticket.resource}`, ticket: id, output: tail.slice(-4000) })?.catch(() => {})
              }
            },
          })
          const head = `exit ${code}${timedOut ? ` (stopped after max_hold_sec ${maxHold})` : ""}; ticket ${id} released; full log ${logPath}`
          return { content: `${head}\n${tail}`, metadata: { ticket: id, exit: code, timedOut, log: logPath } }
        } finally {
          store.release(id, ownerOf(c, id))
        }
      },
    },
  ]
}

export function sessionDeletedID(ev: unknown): string | null {
  if (typeof ev !== "object" || ev === null) return null
  const e = ev as Json
  if (e.type !== "session.deleted") return null
  const data = (e.data ?? e.properties) as Json | undefined
  const id = data?.sessionID ?? (data?.info as Json | undefined)?.id
  return typeof id === "string" ? id : null
}

// opencode makes one plugin instance per location and disposes idle ones. All instances in a process
// share one Store per directory; the last dispose closes it.
const shared = new Map<string, { store: Store; refs: number }>()

function acquireStore(opts: StoreOptions): Store {
  const probe = new Store(opts)
  const entry = shared.get(probe.dir)
  if (entry) {
    probe.close()
    entry.refs++
    return entry.store
  }
  shared.set(probe.dir, { store: probe, refs: 1 })
  return probe
}

function releaseStore(store: Store): void {
  const entry = shared.get(store.dir)
  if (!entry || entry.store !== store) return store.close()
  if (--entry.refs > 0) return
  shared.delete(store.dir)
  store.close()
}

export default {
  id: "resource-queue",
  async setup(ctx: Ctx) {
    const o = (ctx.options ?? {}) as Json
    const store = acquireStore({
      dir: o.dir as string | undefined,
      checkIntervalMs: o.checkIntervalMs as number | undefined,
      staleSec: o.staleSec as number | undefined,
      backfillMaxSec: o.backfillMaxSec as number | undefined,
      capacity: o.capacity as StoreOptions["capacity"],
    })
    const tools = createTools(store, { cwd: ctx.location?.directory })
    const reg = await ctx.tool.transform((editor) => {
      for (const t of tools) {
        editor.add({
          name: t.name,
          description: t.description,
          input: t.input,
          options: { codemode: false },
          execute: async (input: Json, c: ToolCtx) => {
            try {
              return await t.execute(input, c)
            } catch (e) {
              return { content: `error: ${(e as Error).message}` }
            }
          },
        })
      }
    })
    const abort = new AbortController()
    void (async () => {
      while (!abort.signal.aborted && ctx.event) {
        try {
          for await (const ev of ctx.event.subscribe({ signal: abort.signal })) {
            const id = sessionDeletedID(ev)
            if (id) store.sessionEnded(id)
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 1000))
      }
    })()
    return async () => {
      abort.abort()
      await reg.dispose()
      releaseStore(store)
    }
  },
}
