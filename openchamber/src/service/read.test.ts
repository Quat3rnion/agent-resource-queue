import { afterAll, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { TEST_ROOT } from "../../../test/root.ts"
import { Store } from "../../../src/store.ts"
import { readSnapshot, type Query } from "./read.ts"

const DIR = join(TEST_ROOT, `oc-${process.pid}`)
mkdirSync(DIR, { recursive: true })
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

const host = { name: "test", memAvailableKb: 1, memTotalKb: 2, compilers: [] }

test("snapshot shows holders, queue, blocked preconditions, dead owners, stats and events", async () => {
  const s = new Store({ dir: DIR, probe: { memAvailableKb: () => 0, processNames: () => [] } })
  const q: Query = (sql, ...p) => s.db.prepare(sql).all(...p) as Record<string, unknown>[]
  const dead = Bun.spawn(["true"])
  await dead.exited
  const a = s.acquire({ resource: "gpu", holder: "alice", nick: "alice-irc", session_id: "ses_A", purpose: "bench", max_hold_sec: 600 })
  s.acquire({ resource: "gpu", holder: "bob", session_id: "ses_B", purpose: "train", max_hold_sec: 60, preconditions: [{ kind: "mem_available", min_kb: 8 * 1024 * 1024, for_sec: 60 }] })
  s.acquire({ resource: "build", holder: "carol", purpose: "make", max_hold_sec: 60, exclusive: true })
  s.db.prepare("UPDATE tickets SET owner_pid = ?, owner_start = NULL WHERE id = ?").run(dead.pid, a.ticket.id)

  const snap = readSnapshot(q, DIR, Date.now(), host)
  const gpu = snap.resources.find((r) => r.name === "gpu")!
  const build = snap.resources.find((r) => r.name === "build")!
  expect(gpu).toMatchObject({ capacity: 1, used: 1 })
  expect(gpu.holders[0]).toMatchObject({ ticket: a.ticket.id, holder: "alice", nick: "alice-irc", purpose: "bench", alive: false, claimed: true })
  expect(gpu.queue[0]).toMatchObject({ position: 1, holder: "bob", preconditions: ["MemAvailable >= 8 GB for 60 s"] })
  expect(build).toMatchObject({ capacity: 4, used: 4 })
  expect(build.holders[0]!.exclusive).toBe(true)
  expect(gpu.stats.grants).toBe(1)
  expect(snap.recent.map((e) => e.event)).toContain("granted")

  // The reader does not change the store: the dead owner is still listed until a real check.
  expect(s.ticket(a.ticket.id)!.state).toBe("held")
  s.release(a.ticket.id, { sessionID: "ses_A" })
  const after = readSnapshot(q, DIR, Date.now(), host).resources.find((r) => r.name === "gpu")!
  expect(after.queue[0]!.pendingReason).toContain("MemAvailable")
  s.close()
})
