#!/usr/bin/env bun
// resource-queue CLI. The wrapper scripts gpu-turn.sh and build-gate.sh call it.
// Exit codes: 0 ok / granted, 75 not granted yet (call again), 1 ticket ended or error, 2 usage.
import { parseArgs } from "node:util"
import { Store, formatStatus, type Owner, type WaitResult } from "./store.ts"
import { runHeld } from "./run.ts"
import type { Precondition } from "./preconditions.ts"
import { configPath, defaultDir, flockFor, loadConfig } from "./config.ts"

const USAGE = `usage: resource-queue <command> [options]
  acquire  --resource R --holder H [--purpose P] [--max-hold S] [--exclusive] [--keep] [precondition options]
  wait     --ticket T --holder H [--timeout S]
  release  --ticket T --holder H
  cancel   --ticket T --holder H
  status   [--resource R] [--json]
  capacity --resource R --set N
  run      --resource R --holder H --max-hold S [--wait S] [--exclusive] [--keep] [--purpose P] [--flock gpu|build] [precondition options] -- cmd...
  config   show the store directory and the flocks that are used, and where they come from
precondition options: --min-mem-kb KB [--mem-for-sec S]  --no-proc name,name [--proc-for-sec S]  --no-compiler [--proc-for-sec S]
common: --dir DIR --nick N --session ID
store directory: --dir, else $RESOURCE_QUEUE_DIR, else "dir" in ${configPath()}, else ~/.local/state/resource-queue
--flock gpu|build: also run the command under that flock file ($GPU_FLOCK / $BUILD_FLOCK or "flocks" in the config),
  shared for a build slot, exclusive otherwise. Nothing happens when no file is set.
--keep: the waiting ticket outlives this process (call again with the same holder to keep your place).`

const opts = {
  dir: { type: "string" }, resource: { type: "string" }, holder: { type: "string" }, purpose: { type: "string" },
  "max-hold": { type: "string" }, exclusive: { type: "boolean" }, keep: { type: "boolean" }, ticket: { type: "string" },
  timeout: { type: "string" }, wait: { type: "string" }, json: { type: "boolean" }, set: { type: "string" },
  "min-mem-kb": { type: "string" }, "mem-for-sec": { type: "string" }, "no-proc": { type: "string" }, "proc-for-sec": { type: "string" },
  nick: { type: "string" }, session: { type: "string" }, quiet: { type: "boolean" },
  "no-compiler": { type: "boolean" }, flock: { type: "string" },
} as const

function fail(msg: string, code = 2): never {
  process.stderr.write(`resource-queue: ${msg}\n`)
  process.exit(code)
}

const [command, ...rest] = process.argv.slice(2)
if (!command || command === "-h" || command === "--help") fail(USAGE, command ? 0 : 2)
const dash = rest.indexOf("--")
const argv = dash >= 0 ? rest.slice(0, dash) : rest
const cmd = dash >= 0 ? rest.slice(dash + 1) : []
let values: Record<string, string | boolean | undefined>
try {
  values = parseArgs({ args: argv, options: opts, strict: true, allowPositionals: false }).values
} catch (e) {
  fail(`${(e as Error).message}\n${USAGE}`)
}
const str = (k: string) => values[k] as string | undefined
const need = (k: string) => str(k) ?? fail(`--${k} is required for ${command}`)
const numArg = (k: string, def?: number): number => {
  const v = str(k)
  if (v === undefined) return def ?? fail(`--${k} is required for ${command}`)
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) fail(`--${k} must be a number`)
  return n
}

function preconditions(): Precondition[] {
  const pre: Precondition[] = []
  if (str("min-mem-kb")) pre.push({ kind: "mem_available", min_kb: numArg("min-mem-kb"), for_sec: numArg("mem-for-sec", 0) })
  if (str("no-proc")) pre.push({ kind: "no_process", names: need("no-proc").split(",").filter(Boolean), for_sec: numArg("proc-for-sec", 0) })
  if (values["no-compiler"]) pre.push({ kind: "no_compiler", for_sec: numArg("proc-for-sec", 0) })
  return pre
}

const say = (s: string) => values.quiet || process.stderr.write(`resource-queue: ${s}\n`)
const who = (): Owner => ({ holder: need("holder"), sessionID: str("session") ?? null })

function describe(r: WaitResult): string {
  if (r.status === "waiting")
    return `ticket ${r.ticket.id}: waiting, position ${r.position}, about ${r.eta_sec} s${r.pending_reason ? ` (${r.pending_reason})` : ""}`
  return `ticket ${r.ticket.id}: ${r.status}${r.ticket.end_reason ? ` (${r.ticket.end_reason})` : ""}`
}
const exitFor = (r: WaitResult) => (r.status === "granted" ? 0 : r.status === "waiting" ? 75 : 1)
const print = (v: unknown) => process.stdout.write(JSON.stringify(v, null, 2) + "\n")

if (command === "config") {
  const cfg = loadConfig()
  print({ config: configPath(), dir: str("dir") ?? defaultDir(cfg), env: process.env.RESOURCE_QUEUE_DIR ?? null, flocks: { gpu: flockFor("gpu", cfg), build: flockFor("build", cfg) } })
  process.exit(0)
}

const store = new Store({ dir: str("dir") })

async function main(): Promise<number> {
  switch (command) {
    case "acquire": {
      const r = store.acquire({
        resource: need("resource"), holder: need("holder"), purpose: str("purpose") ?? "", max_hold_sec: numArg("max-hold", 3600),
        nick: str("nick"), session_id: str("session"), exclusive: !!values.exclusive, preconditions: preconditions(),
        owner_pid: values.keep ? null : process.ppid,
      })
      print(r)
      return exitFor(r)
    }
    case "wait": {
      const r = await store.wait(need("ticket"), numArg("timeout", 0), who())
      say(describe(r))
      print(r)
      return exitFor(r)
    }
    case "release":
    case "cancel": {
      const t = command === "release" ? store.release(need("ticket"), who()) : store.cancel(need("ticket"), who())
      say(`ticket ${t.id}: ${t.state}`)
      return 0
    }
    case "status": {
      const s = store.status(str("resource"))
      if (values.json) print(s)
      else process.stdout.write(formatStatus(s))
      return 0
    }
    case "capacity": {
      store.setCapacity(need("resource"), numArg("set"))
      return 0
    }
    case "run": {
      if (!cmd.length) fail("run needs a command after --")
      const flockKind = str("flock")
      if (flockKind !== undefined && flockKind !== "gpu" && flockKind !== "build") fail("--flock must be gpu or build")
      const flockFile = flockKind ? flockFor(flockKind) : null
      // Old callers that still use the flock file directly must not overlap with this command.
      const shared = flockKind === "build" && !values.exclusive
      const runCmd = flockFile ? ["flock", shared ? "-s" : "-x", "-E", "75", "-w", String(numArg("wait", 900)), flockFile, ...cmd] : cmd
      const owner = who()
      const maxHold = numArg("max-hold")
      const keep = !!values.keep
      const ac = new AbortController()
      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(sig, () => ac.abort())
      let r = store.acquire({
        resource: need("resource"), holder: owner.holder!, purpose: str("purpose") ?? cmd.join(" ").slice(0, 200),
        max_hold_sec: maxHold + 30, nick: str("nick"), session_id: owner.sessionID, exclusive: !!values.exclusive,
        preconditions: preconditions(), owner_pid: keep ? null : process.pid,
      })
      if (r.status === "waiting") {
        say(describe(r))
        r = await store.wait(r.ticket.id, numArg("wait", 900), owner, ac.signal)
      }
      if (r.status !== "granted") {
        if (r.status === "waiting" && !keep) store.cancel(r.ticket.id, owner)
        say(r.status === "waiting" ? `${describe(r)}; not granted yet, call again${keep ? " with the same holder" : ""}` : describe(r))
        return r.status === "waiting" ? 75 : 1
      }
      say(`ticket ${r.ticket.id}: granted, running`)
      try {
        const { code, timedOut } = await runHeld(store, r.ticket.id, owner, { cmd: runCmd, maxHoldSec: maxHold, signal: ac.signal })
        if (timedOut) say(`command passed max hold time ${maxHold} s and was stopped`)
        return code
      } finally {
        store.release(r.ticket.id, owner)
      }
    }
    default:
      fail(`unknown command ${command}\n${USAGE}`)
  }
}

try {
  const code = await main()
  store.close()
  process.exit(code)
} catch (e) {
  fail((e as Error).message, 1)
}
