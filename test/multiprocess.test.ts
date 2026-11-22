// Several real processes share one store through the CLI and the wrapper scripts.
import { afterAll, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
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

async function status(dir: string, resource: string) {
  const p = cli(dir, ["status", "--resource", resource, "--json"])
  const snapshots = await new Response(p.stdout).json() as ReturnType<Store["status"]>
  expect(await p.exited).toBe(0)
  return snapshots[0]!
}

function wrapper(dir: string, mode: "gpu" | "build" | "quiet", holder: string, wait: string, cmd: string[]) {
  const argv = mode === "gpu" ? [join(BIN, "gpu-turn.sh"), holder, "20"] : [join(BIN, "build-gate.sh"), mode]
  return Bun.spawn([...argv, ...cmd], {
    env: env(dir, { BUILD_GATE_NAME: holder, GPU_QUEUE_WAIT: wait, BUILD_WAIT: wait, QUIET_WAIT: wait, BUILD_MAX_HOLD: "20", QUIET_MAX_HOLD: "20" }),
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  })
}

async function until(fn: () => boolean | Promise<boolean>, ms = 10_000) {
  const end = Date.now() + ms
  while (!(await fn())) {
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

for (const mode of ["gpu", "build", "quiet"] as const) {
  const resource = mode === "gpu" ? "gpu" : "build"
  const label = mode === "gpu" ? "gpu-turn.sh" : `build-gate.sh ${mode}`

  test(`${label}: deliberate exit 75 keeps the same FIFO ticket for retry`, async () => {
    const dir = fresh()
    expect(await cli(dir, ["capacity", "--resource", resource, "--set", "1"]).exited).toBe(0)
    const hold = cli(dir, ["acquire", "--resource", resource, "--holder", "blocker", "--session", "test", "--keep", "--exclusive", "--max-hold", "60"])
    const blocker = (await new Response(hold.stdout).json()).ticket.id as string
    expect(await hold.exited).toBe(0)
    const run = (holder: string) => wrapper(dir, mode, holder, "0", ["echo", holder])
    const first = run("first")
    expect(await first.exited).toBe(75)
    expect(await new Response(first.stderr).text()).toContain("position 1")
    expect(await run("next").exited).toBe(75)
    const waiting = (await status(dir, resource)).queue
    expect(waiting.map((q) => q.holder)).toEqual(["first", "next"])

    expect(await cli(dir, ["release", "--ticket", blocker, "--session", "test", "--holder", "blocker"]).exited).toBe(0)
    // The later caller retries first; it must not take the head's grant.
    expect(await run("next").exited).toBe(75)
    const retry = run("first")
    expect(await retry.exited).toBe(0)
    expect((await new Response(retry.stdout).text()).trim()).toBe("first")
    expect(await run("next").exited).toBe(0)
    const done = await status(dir, resource)
    expect(done.holders).toEqual([])
    expect(done.recent.filter((e) => e.event === "released (held)").map((e) => e.ticket).reverse()).toEqual([
      blocker, ...waiting.map((q) => q.ticket),
    ])
  }, 30_000)

  for (const signal of [false, true]) {
    test(`${label}: ${signal ? "stopping" : "exiting"} a duplicate before flock cannot end the owner's ticket`, async () => {
      const dir = fresh()
      const out = join(dir, "order")
      // Initialize the store before racing wrappers, with one slot so both build modes queue.
      expect(await cli(dir, ["capacity", "--resource", resource, "--set", "1"]).exited).toBe(0)
      const snapshot = () => status(dir, resource)
      const children: { stdin: { end(): unknown }; exited: Promise<number> }[] = []
      const track = <T extends (typeof children)[number]>(p: T) => {
        children.push(p)
        return p
      }
      const wrap = (holder: string, wait: string, cmd: string[]) => track(wrapper(dir, mode, holder, wait, cmd))
      try {
        // A legacy user of the physical lock keeps even the logical owner from entering its command.
        const ready = join(dir, "legacy-ready")
        const legacy = track(Bun.spawn(
          ["flock", "-x", join(dir, `${resource}.flock`), "bash", "-c", 'touch "$1"; read -r _ || true', "_", ready],
          { env: env(dir), stdin: "pipe", stdout: "pipe", stderr: "pipe" },
        ))
        await until(() => existsSync(ready))
        const primary = wrap("owner", "15", ["bash", "-c", 'echo owner-start >> "$1"; read -r _ || true; echo owner-end >> "$1"', "_", out])
        await until(async () => (await snapshot()).holders[0]?.holder === "owner")
        const ticket = (await snapshot()).holders[0]!.ticket
        const successor = wrap("next", "15", ["bash", "-c", 'echo next >> "$1"', "_", out])
        await until(async () => (await snapshot()).queue[0]?.holder === "next")

        const mirror = wrap("owner", signal ? "5" : "0", ["bash", "-c", 'echo duplicate >> "$1"', "_", out])
        if (signal) {
          // Wait for the wrapper's first diagnostic, not a sleep or a race at startup.
          const stderr = mirror.stderr.getReader()
          try {
            expect((await stderr.read()).done).toBe(false)
            if (mirror.exitCode === null) mirror.kill("SIGTERM")
          } finally {
            stderr.releaseLock()
          }
        }
        expect(await mirror.exited).not.toBe(0)
        const afterMirror = await snapshot()
        expect(afterMirror.holders.map((h) => [h.holder, h.ticket])).toEqual([["owner", ticket]])
        expect(afterMirror.queue.map((q) => q.holder)).toEqual(["next"])
        expect(existsSync(out)).toBe(false)

        legacy.stdin.end()
        expect(await legacy.exited).toBe(0)
        await until(() => existsSync(out) && lines(out)[0] === "owner-start")
        expect((await snapshot()).holders[0]?.ticket).toBe(ticket)
        primary.stdin.end()
        expect(await Promise.all([primary.exited, successor.exited])).toEqual([0, 0])
        expect(lines(out)).toEqual(["owner-start", "owner-end", "next"])
        const done = await snapshot()
        expect(done.holders).toEqual([])
        expect(done.recent.map(({ holder, event }) => [holder, event]).reverse()).toEqual([
          ["owner", "granted"], ["owner", "released (held)"], ["next", "granted"], ["next", "released (held)"],
        ])
      } finally {
        for (const child of children) child.stdin.end()
        await Promise.all(children.map((child) => child.exited))
      }
    }, 30_000)
  }
}

test("gpu-turn.sh: only the waiting owner can cancel its ticket", async () => {
  const dir = fresh()
  expect(await cli(dir, ["acquire", "--resource", "gpu", "--holder", "blocker", "--keep"]).exited).toBe(0)
  const primary = wrapper(dir, "gpu", "owner", "15", ["true"])
  try {
    await until(async () => (await status(dir, "gpu")).queue[0]?.holder === "owner")
    const ticket = (await status(dir, "gpu")).queue[0]!.ticket
    expect(await wrapper(dir, "gpu", "owner", "0", ["true"]).exited).toBe(1)
    expect((await status(dir, "gpu")).queue.map((q) => q.ticket)).toEqual([ticket])
    primary.kill("SIGTERM")
    expect(await primary.exited).toBe(1)
    const after = await status(dir, "gpu")
    expect(after.queue).toEqual([])
    expect(after.recent[0]?.event).toBe("canceled (waiting)")
  } finally {
    if (primary.exitCode === null) primary.kill("SIGTERM")
    await primary.exited
  }
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
