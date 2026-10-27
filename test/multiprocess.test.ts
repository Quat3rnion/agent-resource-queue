// Several real processes share one store through the CLI and the wrapper scripts.
import { afterAll, expect, test } from "bun:test"
import { mkdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { TEST_ROOT } from "./root.ts"
import { Store } from "../src/store.ts"

const ROOT = join(TEST_ROOT, `mp-${process.pid}`)
const CLI = join(import.meta.dir, "../src/cli.ts")
const BIN = join(import.meta.dir, "../bin")
let n = 0
const fresh = () => {
  const dir = join(ROOT, String(n++))
  mkdirSync(dir, { recursive: true })
  return dir
}
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

const env = (dir: string, extra: Record<string, string> = {}) => ({ ...process.env, RESOURCE_QUEUE_DIR: dir, RESOURCE_QUEUE_CLI: CLI, GPU_FLOCK: join(dir, "gpu.flock"), BUILD_FLOCK: join(dir, "build.flock"), ...extra })
const cli = (dir: string, args: string[], opts: { detached?: boolean } = {}) =>
  Bun.spawn(["bun", CLI, ...args], { env: env(dir), stdout: "pipe", stderr: "pipe", ...opts })
const lines = (p: string) => readFileSync(p, "utf8").trim().split("\n")

async function until(fn: () => boolean, ms = 10_000) {
  const end = Date.now() + ms
  while (!fn()) {
    if (Date.now() > end) throw new Error("timeout")
    await Bun.sleep(25)
  }
}

test("processes that contend for one resource run in FIFO order, one at a time", async () => {
  const dir = fresh()
  const out = join(dir, "order")
  // Queue the holders in a known order (the tickets outlive these calls), then start all runs at once.
  const holders = ["h1", "h2", "h3", "h4", "h5"]
  for (const h of holders) expect(await cli(dir, ["acquire", "--resource", "gpu", "--holder", h, "--keep", "--max-hold", "60"]).exited).toBeLessThanOrEqual(75)
  const procs = [...holders].reverse().map((h) =>
    cli(dir, ["run", "--resource", "gpu", "--holder", h, "--keep", "--max-hold", "30", "--wait", "30", "--", "bash", "-c", `echo start ${h} >> ${out}; sleep 0.2; echo end ${h} >> ${out}`]),
  )
  const codes = await Promise.all(procs.map((p) => p.exited))
  expect(codes).toEqual([0, 0, 0, 0, 0])
  expect(lines(out)).toEqual(holders.flatMap((h) => [`start ${h}`, `end ${h}`]))
}, 30_000)

test("a crashed CLI holder whose command also died loses the lock within one check interval", async () => {
  const dir = fresh()
  const holder = cli(dir, ["run", "--resource", "gpu", "--holder", "victim", "--max-hold", "600", "--", "sleep", "600"], { detached: true })
  const s = new Store({ dir, checkIntervalMs: 200 })
  await until(() => s.status("gpu")[0]!.holders.some((h) => h.holder === "victim" && s.ticket(h.ticket)!.run_pid !== null))
  const b = s.acquire({ resource: "gpu", holder: "next", purpose: "x", max_hold_sec: 60 })
  expect(b.status).toBe("waiting")
  const sid = s.ticket(s.status("gpu")[0]!.holders[0]!.ticket)!.run_pid!
  process.kill(-holder.pid, "SIGKILL")
  await holder.exited
  // The command has its own session, so it survives the runner and keeps the lock while it runs.
  await Bun.sleep(300)
  expect((await s.wait(b.ticket.id, 0, { holder: "next" })).status).toBe("waiting")
  process.kill(-sid, "SIGKILL")
  const t0 = Date.now()
  expect((await s.wait(b.ticket.id, 10, { holder: "next" })).status).toBe("granted")
  expect(Date.now() - t0).toBeLessThan(200 + 300)
  s.close()
}, 30_000)

test("concurrent use from many processes keeps the store consistent and respects capacity", async () => {
  const dir = fresh()
  const s = new Store({ dir, capacity: { build: 3 } })
  const workers = Array.from({ length: 8 }, (_, w) =>
    Bun.spawn(["bash", "-c", `for i in $(seq 1 6); do bun ${CLI} run --resource build --holder w${w}-$i --max-hold 30 --wait 60 --quiet -- true || exit 9; done`], { env: env(dir), stderr: "pipe" }),
  )
  expect(await Promise.all(workers.map((w) => w.exited))).toEqual(Array(8).fill(0))
  expect(s.db.prepare("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" })
  const tickets = s.db.prepare("SELECT state, count(*) AS n FROM tickets GROUP BY state").all()
  expect(tickets).toEqual([{ state: "released", n: 48 }])
  // Replay the log: never more than 3 holders at once.
  const ev = s.db.prepare("SELECT event FROM events WHERE resource = 'build' ORDER BY id").all() as { event: string }[]
  let held = 0
  let peak = 0
  for (const e of ev) {
    if (e.event === "granted") peak = Math.max(peak, ++held)
    else if (e.event.endsWith("(held)")) held--
  }
  expect(held).toBe(0)
  expect(peak).toBeLessThanOrEqual(3)
  expect(peak).toBeGreaterThan(1)
  s.close()
}, 120_000)

test("gpu-turn.sh: exit 75 while another holds the GPU, keeps its place, then runs", async () => {
  const dir = fresh()
  const s = new Store({ dir })
  const a = s.acquire({ resource: "gpu", holder: "plugin-agent", session_id: "ses_X", purpose: "x", max_hold_sec: 60 })
  expect(a.status).toBe("granted")
  const turn = (name: string) => Bun.spawn([join(BIN, "gpu-turn.sh"), name, "30", "echo", "ran"], { env: env(dir, { GPU_QUEUE_WAIT: "1" }), stdout: "pipe", stderr: "pipe" })
  const p1 = turn("wrapper-agent")
  expect(await p1.exited).toBe(75)
  expect(await new Response(p1.stderr).text()).toContain("position 1")
  expect(s.status("gpu")[0]!.queue.map((q) => q.holder)).toEqual(["wrapper-agent"])
  s.release(a.ticket.id, { sessionID: "ses_X" })
  const p2 = turn("wrapper-agent")
  expect(await p2.exited).toBe(0)
  expect((await new Response(p2.stdout).text()).trim()).toBe("ran")
  expect(s.status("gpu")[0]!.queue).toEqual([])
  s.close()
}, 30_000)

test("build-gate.sh quiet waits for builds, and new builds queue behind it", async () => {
  const dir = fresh()
  const out = join(dir, "log")
  const gate = (mode: string, cmd: string, extra: Record<string, string> = {}) =>
    Bun.spawn([join(BIN, "build-gate.sh"), mode, "bash", "-c", cmd], { env: env(dir, extra), stderr: "pipe" })
  const s = new Store({ dir })
  const b1 = gate("build", `echo b1-start >> ${out}; sleep 1; echo b1-end >> ${out}`)
  await until(() => s.status("build")[0]!.holders.length === 1)
  const q = gate("quiet", `echo quiet >> ${out}`)
  await until(() => s.status("build")[0]!.queue.length === 1)
  const b2 = gate("build", `echo b2 >> ${out}`)
  expect(await Promise.all([b1.exited, q.exited, b2.exited])).toEqual([0, 0, 0])
  expect(lines(out)).toEqual(["b1-start", "b1-end", "quiet", "b2"])
  // A quiet window that cannot start in time exits 75 and leaves the queue.
  const b3 = gate("build", "sleep 3")
  await until(() => s.status("build")[0]!.holders.length === 1)
  const q2 = gate("quiet", "true", { QUIET_WAIT: "1" })
  expect(await q2.exited).toBe(75)
  expect(s.status("build")[0]!.queue).toEqual([])
  await b3.exited
  s.close()
}, 30_000)

test("a wrapper installed as a symbolic link finds the CLI without RESOURCE_QUEUE_CLI; no flock unless one is set", async () => {
  const dir = fresh()
  const link = join(dir, "gpu-turn.sh")
  await Bun.$`ln -s ${join(BIN, "gpu-turn.sh")} ${link}`
  const { RESOURCE_QUEUE_CLI: _, GPU_FLOCK: __, ...rest } = env(dir, { XDG_CONFIG_HOME: join(dir, "no-config") })
  const p = Bun.spawn([link, "linked", "30", "bash", "-c", "echo ok"], { env: rest, stdout: "pipe", stderr: "pipe" })
  expect(await p.exited).toBe(0)
  expect((await new Response(p.stdout).text()).trim()).toBe("ok")
  const ev = new Store({ dir }).status("gpu")[0]!.recent.map((e) => e.event)
  expect(ev).toContain("granted")
}, 30_000)
