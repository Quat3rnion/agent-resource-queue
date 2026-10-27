// resource_run and the scripts must not release a lock while processes that the command started still run.
import { afterAll, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { TEST_ROOT } from "./root.ts"
import { Store } from "../src/store.ts"
import { runHeld } from "../src/run.ts"
import { sessionMembers } from "../src/proc.ts"

const ROOT = join(TEST_ROOT, `run-${process.pid}`)
let n = 0
const fresh = () => {
  const dir = join(ROOT, String(n++))
  mkdirSync(dir, { recursive: true })
  return dir
}
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

const who = { holder: "runner" }
const grant = (s: Store) => s.acquire({ resource: "build", holder: "runner", purpose: "t", max_hold_sec: 600 }).ticket.id

test("a timeout stops the whole process tree, also orphaned grandchildren (bug: make/clang survived exit 124)", async () => {
  const s = new Store({ dir: fresh() })
  const id = grant(s)
  // The subshell exits at once, so its sleep is reparented away from bash: a child.kill() cannot reach it.
  const r = await runHeld(s, id, who, { cmd: ["bash", "-c", "(sleep 300 &); (sleep 301 &); sleep 302"], maxHoldSec: 1, graceMs: 500, onOutput: () => {} })
  expect(r).toEqual({ code: 124, timedOut: true })
  const sid = s.ticket(id)!.run_pid!
  expect(sessionMembers(sid)).toEqual([])
  s.close()
}, 20_000)

test("a grandchild that ignores TERM is killed after the grace time", async () => {
  const s = new Store({ dir: fresh() })
  const id = grant(s)
  const t0 = Date.now()
  const r = await runHeld(s, id, who, { cmd: ["bash", "-c", "(trap '' TERM; sleep 300) & sleep 302"], maxHoldSec: 1, graceMs: 500, onOutput: () => {} })
  expect(r.timedOut).toBe(true)
  expect(sessionMembers(s.ticket(id)!.run_pid!)).toEqual([])
  expect(Date.now() - t0).toBeLessThan(5_000)
  s.close()
}, 20_000)

test("background jobs left behind by a command that exits normally are stopped before release", async () => {
  const s = new Store({ dir: fresh() })
  const id = grant(s)
  const r = await runHeld(s, id, who, { cmd: ["bash", "-c", "(sleep 300 &); echo done"], maxHoldSec: 60, graceMs: 500, onOutput: () => {} })
  expect(r).toEqual({ code: 0, timedOut: false })
  expect(sessionMembers(s.ticket(id)!.run_pid!)).toEqual([])
  s.close()
}, 20_000)

test("the lock stays while processes of the command's session live, even after the runner and the command died", async () => {
  const s = new Store({ dir: fresh() })
  const id = grant(s)
  // Start a session whose leader exits at once and leaves an orphan, like a crashed runner.
  const leader = Bun.spawn(["bash", "-c", "(sleep 30 &)"], { detached: true })
  await leader.exited
  await Bun.sleep(100)
  s.db.prepare("UPDATE tickets SET owner_pid = NULL, owner_start = NULL, run_pid = ?, run_start = NULL WHERE id = ?").run(leader.pid, id)
  expect(sessionMembers(leader.pid).length).toBe(1)
  s.tick()
  expect(s.ticket(id)!.state).toBe("held")
  for (const pid of sessionMembers(leader.pid)) process.kill(pid, "SIGKILL")
  await Bun.sleep(100)
  s.tick()
  expect(s.ticket(id)!.state).toBe("expired")
  s.close()
}, 20_000)

test("when max_hold_sec frees a ticket whose command still runs (runner crashed), the command is stopped", async () => {
  let now = Date.now()
  const s = new Store({ dir: fresh(), now: () => now })
  const id = s.acquire({ resource: "build", holder: "runner", purpose: "t", max_hold_sec: 10 }).ticket.id
  const leader = Bun.spawn(["bash", "-c", "(sleep 30 &); sleep 31"], { detached: true })
  await Bun.sleep(200)
  s.db.prepare("UPDATE tickets SET owner_pid = NULL, owner_start = NULL, run_pid = ?, run_start = NULL WHERE id = ?").run(leader.pid, id)
  now += 11_000
  s.tick()
  expect(s.ticket(id)!.end_reason).toMatch(/max_hold_sec/)
  await leader.exited
  await Bun.sleep(100)
  expect(sessionMembers(leader.pid)).toEqual([])
  s.close()
}, 20_000)
