import { afterAll, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { TEST_ROOT } from "./root.ts"
import { Store } from "../src/store.ts"
import type { Probe } from "../src/preconditions.ts"

const ROOT = join(TEST_ROOT, `unit-${process.pid}`)
let n = 0
const fresh = () => {
  const dir = join(ROOT, String(n++))
  mkdirSync(dir, { recursive: true })
  return dir
}
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

const A = { sessionID: "ses_A", holder: "alice" }
const B = { sessionID: "ses_B", holder: "bob" }
const C = { sessionID: "ses_C", holder: "carol" }
const acq = (s: Store, who: typeof A, resource = "gpu", extra = {}) =>
  s.acquire({ resource, holder: who.holder, session_id: who.sessionID, purpose: "test", max_hold_sec: 60, ...extra })

describe("FIFO", () => {
  test("two sessions on separate connections get the lock in FIFO order", async () => {
    const dir = fresh()
    const s1 = new Store({ dir, checkIntervalMs: 20 })
    const s2 = new Store({ dir, checkIntervalMs: 20 })
    const a = acq(s1, A)
    const b = acq(s2, B)
    const c = acq(s1, C)
    expect(a.status).toBe("granted")
    expect(b.status).toBe("waiting")
    expect(c).toMatchObject({ status: "waiting", position: 2 })
    expect((await s2.wait(b.ticket.id, 0.1, B)).status).toBe("waiting")
    // c polls first, but b is ahead of it.
    s1.release(a.ticket.id, A)
    expect((await s1.wait(c.ticket.id, 0, C)).status).toBe("waiting")
    expect((await s2.wait(b.ticket.id, 1, B)).status).toBe("granted")
    s2.release(b.ticket.id, B)
    expect((await s1.wait(c.ticket.id, 1, C)).status).toBe("granted")
  })

  test("capacity N grants N; an exclusive ticket waits for all and blocks the ones behind it (no backfill)", () => {
    const s = new Store({ dir: fresh(), capacity: { build: 2 }, backfillMaxSec: 0 })
    const w = [A, B].map((o) => acq(s, o, "build"))
    expect(w.map((r) => r.status)).toEqual(["granted", "granted"])
    const q = acq(s, C, "build", { exclusive: true })
    const late = acq(s, { sessionID: "ses_D", holder: "dave" }, "build")
    expect(q.status).toBe("waiting")
    s.release(w[0]!.ticket.id, A)
    expect(s.poll(late.ticket.id, { sessionID: "ses_D" }).status).toBe("waiting") // one slot free, but FIFO
    s.release(w[1]!.ticket.id, B)
    expect(s.poll(q.ticket.id, C).status).toBe("granted")
    s.release(q.ticket.id, C)
    expect(s.poll(late.ticket.id, { sessionID: "ses_D" }).status).toBe("granted")
  })

  test("a second acquire by the same owner returns the same ticket", () => {
    const s = new Store({ dir: fresh() })
    acq(s, A)
    const b1 = acq(s, B)
    const b2 = acq(s, B)
    expect(b2.ticket.id).toBe(b1.ticket.id)
  })
})

describe("backfill", () => {
  const D = { sessionID: "ses_D", holder: "dave" }
  test("a short build starts while builds drain for a waiting exclusive ticket; a long one does not", () => {
    let now = 1_000_000
    const s = new Store({ dir: fresh(), now: () => now, capacity: { build: 2 } })
    const a = acq(s, A, "build", { max_hold_sec: 600 })
    const q = acq(s, B, "build", { exclusive: true })
    const long = acq(s, C, "build", { max_hold_sec: 300 })
    const short = acq(s, D, "build", { max_hold_sec: 60 })
    expect(q.status).toBe("waiting")
    expect(long.status).toBe("waiting") // max_hold_sec over backfillMaxSec
    expect(short.status).toBe("granted")
    expect(s.ticket(short.ticket.id)!.backfill).toBe(1)
    // The exclusive ticket still comes before the long one, once the slots are free.
    s.release(a.ticket.id, A)
    s.release(short.ticket.id, D)
    expect(s.poll(q.ticket.id, B).status).toBe("granted")
    expect(s.poll(long.ticket.id, C).status).toBe("waiting")
  })

  test("a backfilled job must end before every running holder must end", () => {
    let now = 1_000_000
    const s = new Store({ dir: fresh(), now: () => now, capacity: { build: 2 } })
    acq(s, A, "build", { max_hold_sec: 100 })
    acq(s, B, "build", { exclusive: true })
    now += 50_000
    expect(acq(s, C, "build", { max_hold_sec: 60 }).status).toBe("waiting") // would end at 110 s > 100 s
    expect(acq(s, D, "build", { max_hold_sec: 40 }).status).toBe("granted")
  })

  test("no backfill during a quiet hold, with backfillMaxSec 0, or past a failing precondition", () => {
    const s = new Store({ dir: fresh(), capacity: { build: 2 }, probe: { memAvailableKb: () => 0, processNames: () => [] } })
    acq(s, A, "build", { exclusive: true })
    expect(acq(s, B, "build", { max_hold_sec: 30 }).status).toBe("waiting") // quiet hold: no free slot
    const off = new Store({ dir: fresh(), capacity: { build: 2 }, backfillMaxSec: 0 })
    acq(off, A, "build", { max_hold_sec: 600 })
    acq(off, B, "build", { exclusive: true })
    expect(acq(off, C, "build", { max_hold_sec: 30 }).status).toBe("waiting")
    const pre = new Store({ dir: fresh(), capacity: { build: 2 }, probe: { memAvailableKb: () => 0, processNames: () => [] } })
    acq(pre, A, "build", { max_hold_sec: 600 })
    acq(pre, B, "build", { exclusive: true })
    expect(acq(pre, C, "build", { max_hold_sec: 30, preconditions: [{ kind: "mem_available", min_kb: 1 }] }).status).toBe("waiting")
  })

  test("a backfilled grant keeps its deadline: seeing it later does not extend it", () => {
    let now = 1_000_000
    const s = new Store({ dir: fresh(), now: () => now, capacity: { build: 2 } })
    acq(s, A, "build", { max_hold_sec: 600 })
    acq(s, B, "build", { exclusive: true })
    const d = acq(s, D, "build", { max_hold_sec: 60 }) // granted at once and seen
    expect(d.status).toBe("granted")
    const c = acq(s, C, "build", { max_hold_sec: 60 })
    expect(s.ticket(c.ticket.id)!.state).toBe("waiting") // the free slot is taken by d
    s.release(d.ticket.id, D)
    s.tick() // c is backfilled now, without c looking
    expect(s.ticket(c.ticket.id)!.backfill).toBe(1)
    now += 40_000
    expect(s.poll(c.ticket.id, C).status).toBe("granted")
    now += 21_000 // 61 s after the grant
    s.tick()
    expect(s.ticket(c.ticket.id)!.end_reason).toMatch(/max_hold_sec/)
  })
})

describe("ownership", () => {
  test("only the owner can cancel or release", () => {
    const s = new Store({ dir: fresh() })
    const a = acq(s, A)
    expect(() => s.cancel(a.ticket.id, B)).toThrow(/only its owner/)
    expect(() => s.release(a.ticket.id, { holder: "alice" })).toThrow(/only its owner/) // same holder, other session
    expect(s.cancel(a.ticket.id, A).state).toBe("canceled")
  })
})

describe("crash safety", () => {
  test("a holder whose process dies loses the lock within one check interval", async () => {
    const s = new Store({ dir: fresh(), checkIntervalMs: 100 })
    const victim = Bun.spawn(["sleep", "60"])
    const a = s.acquire({ resource: "gpu", holder: "crasher", purpose: "x", max_hold_sec: 600, owner_pid: victim.pid })
    expect(a.status).toBe("granted")
    const b = acq(s, B)
    victim.kill(9)
    await victim.exited
    const t0 = Date.now()
    const r = await s.wait(b.ticket.id, 5, B)
    expect(r.status).toBe("granted")
    expect(Date.now() - t0).toBeLessThan(100 + 50)
    expect(s.ticket(a.ticket.id)).toMatchObject({ state: "expired", end_reason: expect.stringContaining("died") })
  })

  test("the lock stays while the run process lives, even if the caller died", async () => {
    const s = new Store({ dir: fresh() })
    const caller = Bun.spawn(["sleep", "60"])
    const child = Bun.spawn(["sleep", "60"])
    const a = s.acquire({ resource: "gpu", holder: "x", purpose: "x", max_hold_sec: 600, owner_pid: caller.pid })
    s.bindRun(a.ticket.id, { holder: "x" }, child.pid)
    caller.kill(9)
    await caller.exited
    s.tick()
    expect(s.ticket(a.ticket.id)!.state).toBe("held")
    child.kill(9)
    await child.exited
    s.tick()
    expect(s.ticket(a.ticket.id)!.state).toBe("expired")
  })

  test("a grant that arrives while the owner is between tool calls stays claimable (bug: 300 s claim window)", () => {
    let now = 1_000_000
    const s = new Store({ dir: fresh(), now: () => now }) // default staleSec 900
    s.setCapacity("build", 1)
    const a = acq(s, A, "build", { max_hold_sec: 600 })
    const b = acq(s, B, "build")
    expect(s.poll(b.ticket.id, B).status).toBe("waiting") // b's last poll
    now += 142_000
    s.release(a.ticket.id, A) // grant comes 142 s after b's last poll
    now += 301_000 // b's next call comes 443 s after its last poll, 301 s after the grant
    s.tick()
    expect(s.poll(b.ticket.id, B).status).toBe("granted")
  })

  test("closing the store during a wait does not fail the wait (bug: closed database)", async () => {
    const s = new Store({ dir: fresh(), checkIntervalMs: 20 })
    const a = acq(s, A)
    const b = acq(s, B)
    const waiting = s.wait(b.ticket.id, 5, B)
    await Bun.sleep(50)
    s.close() // an idle plugin instance is disposed while another call waits
    const other = new Store({ dir: s.dir })
    other.release(a.ticket.id, A)
    expect((await waiting).status).toBe("granted")
    other.close()
  })

  test("a reused PID with another start time counts as dead", () => {
    const s = new Store({ dir: fresh() })
    const a = s.acquire({ resource: "gpu", holder: "x", purpose: "x", max_hold_sec: 600, owner_pid: process.pid })
    s.db.prepare("UPDATE tickets SET owner_start = '1' WHERE id = ?").run(a.ticket.id)
    s.tick()
    expect(s.ticket(a.ticket.id)!.state).toBe("expired")
  })

  test("max_hold_sec, session end, stale waiters and unseen grants are recovered", () => {
    let now = 1_000_000
    const s = new Store({ dir: fresh(), now: () => now, staleSec: 100 })
    const a = acq(s, A, "gpu", { max_hold_sec: 10 })
    const b = acq(s, B)
    now += 11_000
    s.tick()
    expect(s.ticket(a.ticket.id)!.end_reason).toMatch(/max_hold_sec/)
    expect(s.ticket(b.ticket.id)!.state).toBe("held") // granted while b was not looking
    now += 88_000 // 99 s since b's last poll: b may still be between tool calls
    s.tick()
    expect(s.ticket(b.ticket.id)!.state).toBe("held")
    now += 2_000
    s.tick()
    expect(s.ticket(b.ticket.id)!.end_reason).toMatch(/not seen/)

    // The hold time of a grant starts when the owner sees it.
    const e = acq(s, A, "late")
    const f = acq(s, B, "late", { max_hold_sec: 20 })
    s.release(e.ticket.id, A)
    now += 25_000
    expect(s.poll(f.ticket.id, B).status).toBe("granted")
    now += 15_000
    s.tick()
    expect(s.ticket(f.ticket.id)!.state).toBe("held")

    const c = acq(s, C, "build")
    s.sessionEnded("ses_C")
    expect(s.ticket(c.ticket.id)).toMatchObject({ state: "released", end_reason: "session ended" })

    acq(s, A, "x")
    const d = acq(s, B, "x")
    now += 101_000
    s.tick()
    expect(s.ticket(d.ticket.id)!.end_reason).toMatch(/not polled/)
  })
})

describe("preconditions", () => {
  const probe = (mem: number, procs: string[] = []): Probe => ({ memAvailableKb: () => mem, processNames: () => procs })

  test("a precondition that is never met keeps its place and does not block other resources", () => {
    const p = { mem: 100 }
    const s = new Store({ dir: fresh(), probe: { memAvailableKb: () => p.mem, processNames: () => [] } })
    const a = acq(s, A, "gpu", { preconditions: [{ kind: "mem_available", min_kb: 1_000_000 }] })
    const b = acq(s, B, "gpu")
    const c = acq(s, C, "build")
    expect(a).toMatchObject({ status: "waiting", position: 1, pending_reason: expect.stringContaining("MemAvailable") })
    expect(b).toMatchObject({ status: "waiting", position: 2 })
    expect(c.status).toBe("granted")
    for (let i = 0; i < 3; i++) expect(s.poll(a.ticket.id, A)).toMatchObject({ status: "waiting", position: 1 })
    p.mem = 2_000_000
    expect(s.poll(a.ticket.id, A).status).toBe("granted")
  })

  test("for_sec needs an unbroken pass; a failure restarts the count", () => {
    let now = 0
    const procs: string[] = []
    const s = new Store({ dir: fresh(), now: () => now, probe: { memAvailableKb: () => 1, processNames: () => procs } })
    const a = acq(s, A, "gpu", { preconditions: [{ kind: "no_process", names: ["hipcc", "ld"], for_sec: 60 }] })
    expect(a.status).toBe("waiting")
    now += 50_000
    expect(s.poll(a.ticket.id, A).status).toBe("waiting")
    procs.push("ld")
    now += 1000
    expect(s.poll(a.ticket.id, A)).toMatchObject({ status: "waiting", pending_reason: expect.stringContaining("ld") })
    procs.pop()
    s.poll(a.ticket.id, A)
    now += 59_000
    expect(s.poll(a.ticket.id, A).status).toBe("waiting")
    now += 1000
    expect(s.poll(a.ticket.id, A).status).toBe("granted")
  })

  test("bad preconditions are rejected", () => {
    const s = new Store({ dir: fresh(), probe: probe(0) })
    expect(() => acq(s, A, "gpu", { preconditions: [{ kind: "nope" }] })).toThrow(/kind/)
  })
})

test("the store refuses /tmp", () => {
  expect(() => new Store({ dir: "/tmp/rq" })).toThrow(/tmp/)
})

test("every change is logged with holder, purpose and duration", () => {
  const s = new Store({ dir: fresh() })
  const a = acq(s, A)
  s.release(a.ticket.id, A)
  const ev = s.db.prepare("SELECT event, holder, purpose, duration_ms FROM events ORDER BY id").all() as any[]
  expect(ev.map((e) => e.event)).toEqual(["enqueue", "granted", "released (held)"])
  expect(ev[2]).toMatchObject({ holder: "alice", purpose: "test" })
  expect(typeof ev[2].duration_ms).toBe("number")
})
