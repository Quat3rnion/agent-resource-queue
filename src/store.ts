// Shared resource-lock store: SQLite (WAL) in a directory that all processes share.
// Every change runs in a BEGIN IMMEDIATE transaction, so several processes can use it at once.
import { Database } from "bun:sqlite"
import { appendFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import { HOST, ownersDead, pidStartTime } from "./proc.ts"
import { defaultDir } from "./config.ts"
import { checkNow, parsePreconditions, requiredSec, systemProbe, type Precondition, type Probe } from "./preconditions.ts"

export const DEFAULT_CAPACITY: Record<string, number> = { gpu: 1, build: 4 }

export type State = "waiting" | "held" | "released" | "expired" | "canceled"

export interface Ticket {
  seq: number
  id: string
  resource: string
  holder: string
  nick: string | null
  session_id: string | null
  purpose: string
  exclusive: number
  max_hold_sec: number
  preconditions: string
  ok_since: number | null
  pending_reason: string | null
  owner_pid: number | null
  owner_start: string | null
  run_pid: number | null
  run_start: string | null
  host: string
  state: State
  end_reason: string | null
  created_at: number
  last_seen: number
  granted_at: number | null
  claimed: number
  ended_at: number | null
}

export interface Owner {
  sessionID?: string | null
  holder?: string | null
}

export interface AcquireInput {
  resource: string
  holder: string
  purpose: string
  max_hold_sec: number
  nick?: string | null
  session_id?: string | null
  exclusive?: boolean
  preconditions?: unknown
  /** Process that owns the ticket. A dead owner loses the ticket. Null: ticket outlives the caller. */
  owner_pid?: number | null
}

export interface StoreOptions {
  dir?: string
  probe?: Probe
  now?: () => number
  /** A waiting ticket that nobody polls for this long expires. */
  staleSec?: number
  /** A granted ticket that its owner does not see within this time expires. */
  claimSec?: number
  /** Poll interval of wait(). */
  checkIntervalMs?: number
  capacity?: Record<string, number>
}

export type WaitResult =
  | { status: "granted"; ticket: Ticket }
  | { status: "waiting"; ticket: Ticket; position: number; eta_sec: number; pending_reason: string | null }
  | { status: "expired" | "canceled" | "released"; ticket: Ticket }

const RESOURCE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

export class Store {
  readonly dir: string
  readonly db: Database
  readonly probe: Probe
  readonly now: () => number
  readonly staleSec: number
  readonly claimSec: number
  readonly checkIntervalMs: number
  private readonly logPath: string

  constructor(opts: StoreOptions = {}) {
    this.dir = opts.dir ?? defaultDir()
    if (this.dir === "/tmp" || this.dir.startsWith("/tmp/")) throw new Error("resource-queue: do not use /tmp for the store")
    mkdirSync(this.dir, { recursive: true })
    this.probe = opts.probe ?? systemProbe
    this.now = opts.now ?? Date.now
    this.staleSec = opts.staleSec ?? 900
    this.claimSec = opts.claimSec ?? 300
    this.checkIntervalMs = opts.checkIntervalMs ?? 2000
    this.logPath = join(this.dir, "events.log")
    this.db = new Database(join(this.dir, "queue.sqlite"), { create: true })
    this.db.exec("PRAGMA busy_timeout = 10000")
    this.db.exec("PRAGMA journal_mode = WAL")
    this.db.exec("PRAGMA synchronous = NORMAL")
    this.tx(() => {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS resources (name TEXT PRIMARY KEY, capacity INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS tickets (
          seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, resource TEXT NOT NULL,
          holder TEXT NOT NULL, nick TEXT, session_id TEXT, purpose TEXT NOT NULL,
          exclusive INTEGER NOT NULL DEFAULT 0, max_hold_sec INTEGER NOT NULL, preconditions TEXT NOT NULL,
          ok_since INTEGER, pending_reason TEXT, owner_pid INTEGER, owner_start TEXT, run_pid INTEGER, run_start TEXT, host TEXT NOT NULL,
          state TEXT NOT NULL, end_reason TEXT, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
          granted_at INTEGER, claimed INTEGER NOT NULL DEFAULT 0, ended_at INTEGER);
        CREATE INDEX IF NOT EXISTS tickets_active ON tickets(resource, state, seq);
        CREATE TABLE IF NOT EXISTS ended_sessions (session_id TEXT PRIMARY KEY, at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, ticket TEXT NOT NULL, resource TEXT NOT NULL,
          event TEXT NOT NULL, holder TEXT NOT NULL, nick TEXT, session_id TEXT, purpose TEXT,
          duration_ms INTEGER, detail TEXT);
      `)
      const ins = this.db.prepare("INSERT OR IGNORE INTO resources (name, capacity) VALUES (?, ?)")
      for (const [name, cap] of Object.entries({ ...DEFAULT_CAPACITY, ...opts.capacity })) ins.run(name, cap)
    })
  }

  close(): void {
    this.db.close()
  }

  private pendingLog: string[] = []

  /** Run fn in one BEGIN IMMEDIATE transaction, then write its log lines. */
  private tx<T>(fn: () => T): T {
    this.pendingLog = []
    const result = this.db.transaction(fn).immediate()
    if (this.pendingLog.length) {
      try {
        appendFileSync(this.logPath, this.pendingLog.join(""))
      } catch {}
    }
    this.pendingLog = []
    return result
  }

  private log(t: Ticket, event: string, durationMs: number | null, detail: string | null): void {
    const at = this.now()
    this.db
      .prepare(
        "INSERT INTO events (at, ticket, resource, event, holder, nick, session_id, purpose, duration_ms, detail) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .run(at, t.id, t.resource, event, t.holder, t.nick, t.session_id, t.purpose, durationMs, detail)
    this.pendingLog.push(
      JSON.stringify({ at: new Date(at).toISOString(), event, ticket: t.id, resource: t.resource, holder: t.holder, nick: t.nick, session: t.session_id, purpose: t.purpose, duration_sec: durationMs === null ? null : Math.round(durationMs / 100) / 10, detail }) + "\n",
    )
  }

  private get(id: string): Ticket | null {
    return (this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as Ticket | null) ?? null
  }

  capacity(resource: string): number {
    const row = this.db.prepare("SELECT capacity FROM resources WHERE name = ?").get(resource) as { capacity: number } | null
    return row?.capacity ?? 1
  }

  setCapacity(resource: string, capacity: number): void {
    checkResource(resource)
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("capacity must be an integer >= 1")
    this.tx(() => {
      this.db.prepare("INSERT INTO resources (name, capacity) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET capacity = excluded.capacity").run(resource, capacity)
      this.grantAll()
    })
  }

  // ------------------------------------------------------------------ mutations

  acquire(input: AcquireInput): WaitResult {
    checkResource(input.resource)
    if (!input.holder.trim()) throw new Error("holder must not be empty")
    if (!Number.isFinite(input.max_hold_sec) || input.max_hold_sec <= 0) throw new Error("max_hold_sec must be > 0")
    const pre = parsePreconditions(input.preconditions)
    return this.tx(() => {
      this.reap()
      const owner: Owner = { sessionID: input.session_id, holder: input.holder }
      // A second acquire by the same owner returns the ticket it already has.
      const existing = this.db
        .prepare("SELECT * FROM tickets WHERE resource = ? AND state IN ('waiting','held') AND holder = ? AND coalesce(session_id,'') = ? ORDER BY seq LIMIT 1")
        .get(input.resource, input.holder, input.session_id ?? "") as Ticket | null
      let t: Ticket
      if (existing && isOwner(existing, owner)) {
        t = existing
        this.db.prepare("UPDATE tickets SET last_seen = ? WHERE id = ?").run(this.now(), t.id)
        // A waiting ticket takes the latest request (e.g. a ticket that was carried over from the old queue).
        if (t.state === "waiting")
          this.db.prepare("UPDATE tickets SET max_hold_sec = ?, purpose = ?, nick = coalesce(?, nick) WHERE id = ?")
            .run(Math.ceil(input.max_hold_sec), input.purpose || t.purpose, input.nick ?? null, t.id)
      } else {
        const now = this.now()
        const id = `${input.resource}-${randomBytes(4).toString("hex")}`
        const pid = input.owner_pid ?? null
        this.db
          .prepare(
            `INSERT INTO tickets (id, resource, holder, nick, session_id, purpose, exclusive, max_hold_sec, preconditions,
             owner_pid, owner_start, host, state, created_at, last_seen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'waiting', ?, ?)`,
          )
          .run(id, input.resource, input.holder, input.nick ?? null, input.session_id ?? null, input.purpose, input.exclusive ? 1 : 0,
            Math.ceil(input.max_hold_sec), JSON.stringify(pre), pid, pid === null ? null : pidStartTime(pid), HOST, now, now)
        t = this.get(id)!
        this.log(t, "enqueue", null, pre.length ? `preconditions ${JSON.stringify(pre)}` : null)
      }
      this.grantAll()
      return this.result(this.get(t.id)!, true)
    })
  }

  /** One check: reap stale tickets, grant free slots, report on the ticket. Marks a grant as seen. */
  poll(id: string, who: Owner): WaitResult {
    return this.tx(() => {
      const t0 = this.mustOwn(id, who)
      if (t0.state === "waiting" || t0.state === "held") this.db.prepare("UPDATE tickets SET last_seen = ? WHERE id = ?").run(this.now(), id)
      this.reap()
      this.grantAll()
      return this.result(this.get(id)!, true)
    })
  }

  async wait(id: string, timeoutSec: number, who: Owner, signal?: AbortSignal): Promise<WaitResult> {
    const deadline = this.now() + Math.max(0, timeoutSec) * 1000
    for (;;) {
      const r = this.poll(id, who)
      if (r.status !== "waiting") return r
      const left = deadline - this.now()
      if (left <= 0 || signal?.aborted) return r
      await sleep(Math.min(this.checkIntervalMs, left), signal)
    }
  }

  release(id: string, who: Owner): Ticket {
    return this.end(id, who, "released", "released by owner")
  }

  cancel(id: string, who: Owner): Ticket {
    return this.end(id, who, "canceled", "canceled by owner")
  }

  /**
   * Record the process that uses a granted lock. The ticket also gets the calling process as owner
   * if it has none. The ticket dies only when all its known processes are dead.
   */
  bindRun(id: string, who: Owner, runPid: number): void {
    this.tx(() => {
      const t = this.mustOwn(id, who)
      this.db.prepare("UPDATE tickets SET run_pid = ?, run_start = ?, host = ? WHERE id = ?").run(runPid, pidStartTime(runPid), HOST, id)
      if (t.owner_pid === null || t.host !== HOST)
        this.db.prepare("UPDATE tickets SET owner_pid = ?, owner_start = ? WHERE id = ?").run(process.pid, pidStartTime(process.pid), id)
    })
  }

  /** The opencode session ended: free its tickets. */
  sessionEnded(sessionID: string): number {
    return this.tx(() => {
      this.db.prepare("INSERT OR REPLACE INTO ended_sessions (session_id, at) VALUES (?, ?)").run(sessionID, this.now())
      const n = this.reap()
      this.grantAll()
      return n
    })
  }

  /** Reap and grant without a ticket (status calls, timers). */
  tick(): void {
    this.tx(() => {
      this.reap()
      this.grantAll()
    })
  }

  private end(id: string, who: Owner, state: State, reason: string): Ticket {
    return this.tx(() => {
      const t = this.mustOwn(id, who)
      if (t.state === "waiting" || t.state === "held") this.finish(t, state, reason)
      this.reap()
      this.grantAll()
      return this.get(id)!
    })
  }

  private mustOwn(id: string, who: Owner): Ticket {
    const t = this.get(id)
    if (!t) throw new Error(`unknown ticket ${id}`)
    if (!isOwner(t, who)) throw new Error(`ticket ${id} belongs to ${t.holder}${t.session_id ? ` (session ${t.session_id})` : ""}; only its owner can change it`)
    return t
  }

  private finish(t: Ticket, state: State, reason: string): void {
    const now = this.now()
    this.db.prepare("UPDATE tickets SET state = ?, end_reason = ?, ended_at = ? WHERE id = ?").run(state, reason, now, t.id)
    const dur = t.state === "held" && t.granted_at !== null ? now - t.granted_at : now - t.created_at
    this.log(t, t.state === "held" ? `${state} (held)` : `${state} (waiting)`, dur, reason)
  }

  /** Remove tickets whose owner is gone. Returns the number of reaped tickets. */
  private reap(): number {
    const now = this.now()
    const ended = new Set((this.db.prepare("SELECT session_id FROM ended_sessions").all() as { session_id: string }[]).map((r) => r.session_id))
    let n = 0
    for (const t of this.db.prepare("SELECT * FROM tickets WHERE state IN ('waiting','held')").all() as Ticket[]) {
      let why: string | null = null
      let state: State = "expired"
      if (t.session_id && ended.has(t.session_id)) {
        why = "session ended"
        state = t.state === "held" ? "released" : "canceled"
      } else if (t.host === HOST && ownersDead(t)) {
        why = `owner process ${[t.owner_pid, t.run_pid].filter((p) => p !== null).join(" and ")} died`
      } else if (t.state === "held" && t.claimed && t.granted_at !== null && now - t.granted_at > t.max_hold_sec * 1000) {
        why = `max_hold_sec ${t.max_hold_sec} passed`
      } else if (t.state === "held" && !t.claimed && now - (t.granted_at ?? now) > this.claimSec * 1000) {
        why = `grant not seen by owner within ${this.claimSec} s`
      } else if (t.state === "waiting" && now - t.last_seen > this.staleSec * 1000) {
        why = `not polled for ${this.staleSec} s`
      }
      if (why) {
        this.finish(t, state, why)
        n++
      }
    }
    // Keep the ended-session table small.
    this.db.prepare("DELETE FROM ended_sessions WHERE at < ?").run(now - 7 * 86400_000)
    return n
  }

  /** Strict FIFO per resource: grant from the head while slots are free and the head's preconditions pass. */
  private grantAll(): void {
    const now = this.now()
    const resources = this.db.prepare("SELECT DISTINCT resource FROM tickets WHERE state = 'waiting'").all() as { resource: string }[]
    for (const { resource } of resources) {
      const cap = this.capacity(resource)
      const held = this.db.prepare("SELECT * FROM tickets WHERE resource = ? AND state = 'held'").all(resource) as Ticket[]
      let used = held.reduce((s, t) => s + (t.exclusive ? cap : 1), 0)
      const waiting = this.db.prepare("SELECT * FROM tickets WHERE resource = ? AND state = 'waiting' ORDER BY seq").all(resource) as Ticket[]
      for (const t of waiting) {
        const need = t.exclusive ? cap : 1
        if (used + need > cap) {
          this.setPending(t, used >= cap ? null : "waiting for running holders to finish (exclusive)")
          break
        }
        const pre = JSON.parse(t.preconditions) as Precondition[]
        const fail = pre.length ? checkNow(pre, this.probe) : null
        if (fail !== null) {
          this.db.prepare("UPDATE tickets SET ok_since = NULL WHERE id = ?").run(t.id)
          this.setPending(t, `precondition: ${fail}`)
          break // keep strict FIFO: the tickets behind it on this resource wait too
        }
        const okSince = t.ok_since ?? now
        if (t.ok_since === null) this.db.prepare("UPDATE tickets SET ok_since = ? WHERE id = ?").run(now, t.id)
        const need_ms = requiredSec(pre) * 1000
        if (now - okSince < need_ms) {
          this.setPending(t, `precondition: passing for ${Math.floor((now - okSince) / 1000)} of ${need_ms / 1000} s`)
          break
        }
        this.db.prepare("UPDATE tickets SET state = 'held', granted_at = ?, pending_reason = NULL WHERE id = ?").run(now, t.id)
        this.log(t, "granted", now - t.created_at, `waited ${Math.round((now - t.created_at) / 1000)} s`)
        used += need
      }
    }
  }

  private setPending(t: Ticket, reason: string | null): void {
    if (t.pending_reason !== reason) {
      this.db.prepare("UPDATE tickets SET pending_reason = ? WHERE id = ?").run(reason, t.id)
      if (reason?.startsWith("precondition:") && !t.pending_reason?.startsWith("precondition:")) this.log(t, "precondition-blocked", null, reason)
    }
  }

  private result(t: Ticket, markClaimed: boolean): WaitResult {
    if (t.state === "held") {
      if (markClaimed && !t.claimed) {
        // The hold time starts when the owner sees the grant.
        const now = this.now()
        this.db.prepare("UPDATE tickets SET claimed = 1, granted_at = ? WHERE id = ?").run(now, t.id)
        t = { ...t, claimed: 1, granted_at: now }
      }
      return { status: "granted", ticket: t }
    }
    if (t.state === "waiting") {
      const pos = this.position(t)
      return { status: "waiting", ticket: t, position: pos, eta_sec: this.eta(t.resource, pos), pending_reason: t.pending_reason }
    }
    return { status: t.state, ticket: t }
  }

  private position(t: Ticket): number {
    const r = this.db.prepare("SELECT count(*) AS n FROM tickets WHERE resource = ? AND state = 'waiting' AND seq <= ?").get(t.resource, t.seq) as { n: number }
    return r.n
  }

  /** Rough wait estimate: mean recent hold time, slot by slot. */
  eta(resource: string, position: number): number {
    const now = this.now()
    const cap = this.capacity(resource)
    const recent = this.db
      .prepare("SELECT duration_ms FROM events WHERE resource = ? AND event LIKE '% (held)' ORDER BY id DESC LIMIT 20")
      .all(resource) as { duration_ms: number }[]
    const held = this.db.prepare("SELECT * FROM tickets WHERE resource = ? AND state = 'held'").all(resource) as Ticket[]
    const waiting = this.db.prepare("SELECT * FROM tickets WHERE resource = ? AND state = 'waiting' ORDER BY seq LIMIT ?").all(resource, Math.max(0, position - 1)) as Ticket[]
    const mean = (t: Ticket) => (recent.length ? recent.reduce((s, r) => s + r.duration_ms, 0) / recent.length : t.max_hold_sec * 500)
    const slots: number[] = Array.from({ length: cap }, () => now)
    for (const h of held) {
      const end = Math.min((h.granted_at ?? now) + h.max_hold_sec * 1000, Math.max(now, (h.granted_at ?? now) + mean(h)))
      if (h.exclusive) slots.fill(end)
      else {
        slots.sort((a, b) => a - b)
        slots[0] = Math.max(slots[0]!, end)
      }
    }
    for (const w of waiting) {
      slots.sort((a, b) => a - b)
      if (w.exclusive) slots.fill(slots[slots.length - 1]! + mean(w))
      else slots[0] = slots[0]! + mean(w)
    }
    slots.sort((a, b) => a - b)
    return Math.max(0, Math.round((slots[0]! - now) / 1000))
  }

  // ------------------------------------------------------------------ reads

  status(resource?: string, recent = 10) {
    this.tick()
    const now = this.now()
    const names = resource
      ? [resource]
      : (this.db.prepare("SELECT name FROM resources UNION SELECT resource FROM tickets WHERE state IN ('waiting','held') ORDER BY 1").all() as { name: string }[]).map((r) => r.name)
    return names.map((name) => {
      const active = this.db.prepare("SELECT * FROM tickets WHERE resource = ? AND state IN ('waiting','held') ORDER BY seq").all(name) as Ticket[]
      const holders = active.filter((t) => t.state === "held").map((t) => ({
        ticket: t.id, holder: t.holder, nick: t.nick, session: t.session_id, purpose: t.purpose, exclusive: !!t.exclusive,
        held_sec: Math.round((now - (t.granted_at ?? now)) / 1000), max_hold_sec: t.max_hold_sec,
      }))
      const queue = active.filter((t) => t.state === "waiting").map((t, i) => ({
        position: i + 1, ticket: t.id, holder: t.holder, nick: t.nick, session: t.session_id, purpose: t.purpose, exclusive: !!t.exclusive,
        waited_sec: Math.round((now - t.created_at) / 1000), eta_sec: this.eta(name, i + 1), pending_reason: t.pending_reason,
      }))
      const results = (this.db.prepare("SELECT * FROM events WHERE resource = ? AND event != 'enqueue' ORDER BY id DESC LIMIT ?").all(name, recent) as Record<string, unknown>[]).map((e) => ({
        at: new Date(e.at as number).toISOString(), event: e.event, ticket: e.ticket, holder: e.holder, purpose: e.purpose,
        duration_sec: e.duration_ms === null ? null : Math.round((e.duration_ms as number) / 1000), detail: e.detail,
      }))
      return { resource: name, capacity: this.capacity(name), holders, queue, recent: results }
    })
  }

  ticket(id: string): Ticket | null {
    return this.get(id)
  }
}

export function formatStatus(s: ReturnType<Store["status"]>): string {
  const out: string[] = []
  for (const r of s) {
    out.push(`${r.resource} (capacity ${r.capacity})`)
    for (const h of r.holders) out.push(`  held  ${h.ticket} ${h.holder}${h.nick ? ` [${h.nick}]` : ""} ${h.held_sec}/${h.max_hold_sec} s${h.exclusive ? " exclusive" : ""}: ${h.purpose}`)
    for (const q of r.queue) out.push(`  #${q.position}    ${q.ticket} ${q.holder}${q.nick ? ` [${q.nick}]` : ""} waited ${q.waited_sec} s, eta ${q.eta_sec} s${q.pending_reason ? ` (${q.pending_reason})` : ""}: ${q.purpose}`)
    if (!r.holders.length && !r.queue.length) out.push("  free")
  }
  return out.join("\n") + "\n"
}

export function isOwner(t: Ticket, who: Owner): boolean {
  if (t.session_id) return who.sessionID === t.session_id
  return !!who.holder && who.holder === t.holder
}

function checkResource(r: string): void {
  if (!RESOURCE_RE.test(r)) throw new Error(`bad resource name ${JSON.stringify(r)}: use letters, digits, '.', '_' or '-'`)
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const t = setTimeout(done, ms)
    function done() {
      clearTimeout(t)
      signal?.removeEventListener("abort", done)
      resolve()
    }
    signal?.addEventListener("abort", done, { once: true })
  })
}
