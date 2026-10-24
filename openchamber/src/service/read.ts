// Builds a Snapshot from the resource-queue store. Read only: it never changes the queue.
// The caller gives the SQL access, so the service (node:sqlite) and the tests (bun:sqlite) share this code.
import { hostname } from "node:os"
import { readFileSync } from "node:fs"
import { HOST, memAvailableKb, ownersDead, runningCompilers } from "../../../src/proc.ts"
import { STATS_WINDOW_SEC, type EventView, type Holder, type ResourceView, type Snapshot, type Waiter } from "../shared/snapshot.ts"

export type Query = (sql: string, ...params: (string | number)[]) => Record<string, unknown>[]

interface Row {
  id: string
  resource: string
  holder: string
  nick: string | null
  session_id: string | null
  purpose: string
  exclusive: number
  max_hold_sec: number
  preconditions: string
  pending_reason: string | null
  owner_pid: number | null
  owner_start: string | null
  run_pid: number | null
  run_start: string | null
  host: string
  state: string
  created_at: number
  last_seen: number
  granted_at: number | null
  claimed: number
}

const sec = (ms: number) => Math.max(0, Math.round(ms / 1000))

function alive(t: Row): boolean | null {
  if (t.host !== HOST || (t.owner_pid === null && t.run_pid === null)) return null
  return !ownersDead(t)
}

export function describePrecondition(p: Record<string, unknown>): string {
  const hold = typeof p.for_sec === "number" && p.for_sec > 0 ? ` for ${p.for_sec} s` : ""
  if (p.kind === "mem_available") return `MemAvailable >= ${Math.round(Number(p.min_kb) / 1024 / 1024 * 10) / 10} GB${hold}`
  if (p.kind === "no_process") return `no ${(p.names as string[]).join(", ")}${hold}`
  if (p.kind === "no_compiler") return `no compiler${hold}`
  return JSON.stringify(p)
}

function memTotalKb(): number | null {
  try {
    const m = /^MemTotal:\s+(\d+)\s+kB/m.exec(readFileSync("/proc/meminfo", "utf8"))
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
}

export function hostInfo(): Snapshot["host"] {
  return { name: hostname(), memAvailableKb: memAvailableKb(), memTotalKb: memTotalKb(), compilers: runningCompilers() }
}

export function readSnapshot(q: Query, dir: string, now = Date.now(), host = hostInfo()): Snapshot {
  const caps = new Map(q("SELECT name, capacity FROM resources").map((r) => [r.name as string, r.capacity as number]))
  const active = q("SELECT * FROM tickets WHERE state IN ('waiting','held') ORDER BY seq") as unknown as Row[]
  const since = now - STATS_WINDOW_SEC * 1000
  const names = [...new Set([...caps.keys(), ...active.map((t) => t.resource)])].sort()

  const resources: ResourceView[] = names.map((name) => {
    const capacity = caps.get(name) ?? 1
    const mine = active.filter((t) => t.resource === name)
    const holders: Holder[] = mine.filter((t) => t.state === "held").map((t) => {
      const granted = t.granted_at ?? now
      return {
        ticket: t.id, holder: t.holder, nick: t.nick, session: t.session_id, purpose: t.purpose, exclusive: !!t.exclusive,
        heldSec: sec(now - granted), maxHoldSec: t.max_hold_sec, leftSec: sec(granted + t.max_hold_sec * 1000 - now),
        claimed: !!t.claimed, alive: alive(t), pids: [t.owner_pid, t.run_pid].filter((p): p is number => p !== null),
      }
    })
    const queue: Waiter[] = mine.filter((t) => t.state === "waiting").map((t, i) => {
      let pre: string[] = []
      try {
        pre = (JSON.parse(t.preconditions) as Record<string, unknown>[]).map(describePrecondition)
      } catch {}
      return {
        position: i + 1, ticket: t.id, holder: t.holder, nick: t.nick, session: t.session_id, purpose: t.purpose,
        exclusive: !!t.exclusive, waitedSec: sec(now - t.created_at), lastPollSec: sec(now - t.last_seen),
        pendingReason: t.pending_reason, preconditions: pre, alive: alive(t),
      }
    })
    const used = Math.min(capacity, holders.reduce((s, h) => s + (h.exclusive ? capacity : 1), 0))
    const ev = q("SELECT event, duration_ms FROM events WHERE resource = ? AND at >= ? AND event != 'enqueue'", name, since) as { event: string; duration_ms: number | null }[]
    const waits = ev.filter((e) => e.event === "granted" && e.duration_ms !== null).map((e) => e.duration_ms!)
    const holds = ev.filter((e) => e.event.endsWith("(held)") && e.duration_ms !== null).map((e) => e.duration_ms!)
    const mean = (a: number[]) => (a.length ? sec(a.reduce((s, v) => s + v, 0) / a.length) : null)
    return {
      name, capacity, used, holders, queue,
      stats: {
        grants: waits.length, meanWaitSec: mean(waits), maxWaitSec: waits.length ? sec(Math.max(...waits)) : null, meanHoldSec: mean(holds),
        expired: ev.filter((e) => e.event.startsWith("expired")).length, canceled: ev.filter((e) => e.event.startsWith("canceled")).length,
      },
    }
  })

  const recent: EventView[] = q("SELECT * FROM events WHERE event != 'enqueue' ORDER BY id DESC LIMIT 30").map((e) => ({
    at: e.at as number, resource: e.resource as string, event: e.event as string, ticket: e.ticket as string, holder: e.holder as string,
    nick: (e.nick as string | null) ?? null, purpose: (e.purpose as string | null) ?? null,
    durationSec: e.duration_ms === null ? null : sec(e.duration_ms as number), detail: (e.detail as string | null) ?? null,
  }))

  return { at: now, store: { dir, ok: true, error: null }, host, resources, recent }
}
