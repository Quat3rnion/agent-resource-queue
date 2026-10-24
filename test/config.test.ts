import { afterAll, afterEach, expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { TEST_ROOT } from "./root.ts"
import { defaultDir, flockFor, loadConfig } from "../src/config.ts"
import { baseProcessName, nameMatches, runningCompilers } from "../src/proc.ts"
import { checkNow } from "../src/preconditions.ts"

const ROOT = join(TEST_ROOT, `cfg-${process.pid}`)
const saved = { ...process.env }
afterEach(() => {
  for (const k of ["RESOURCE_QUEUE_DIR", "XDG_CONFIG_HOME", "XDG_STATE_HOME", "GPU_FLOCK", "BUILD_FLOCK", "HOME"]) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

test("store directory: env, then config file, then the XDG state directory", () => {
  const cfgHome = join(ROOT, "cfg")
  mkdirSync(join(cfgHome, "resource-queue"), { recursive: true })
  process.env.HOME = join(ROOT, "home")
  process.env.XDG_CONFIG_HOME = cfgHome
  delete process.env.RESOURCE_QUEUE_DIR
  delete process.env.XDG_STATE_HOME
  expect(defaultDir()).toBe(join(ROOT, "home", ".local", "state", "resource-queue"))
  process.env.XDG_STATE_HOME = join(ROOT, "state")
  expect(defaultDir()).toBe(join(ROOT, "state", "resource-queue"))
  writeFileSync(join(cfgHome, "resource-queue", "config.json"), JSON.stringify({ dir: "~/queue", flocks: { gpu: "/locks/gpu.lock" } }))
  expect(defaultDir()).toBe(join(ROOT, "home", "queue"))
  expect(flockFor("gpu")).toBe("/locks/gpu.lock")
  expect(flockFor("build")).toBeNull()
  process.env.GPU_FLOCK = ""
  expect(flockFor("gpu")).toBeNull() // an empty variable turns the flock off
  process.env.RESOURCE_QUEUE_DIR = "/srv/rq"
  expect(defaultDir()).toBe("/srv/rq")
  writeFileSync(join(cfgHome, "resource-queue", "config.json"), "{ not json")
  expect(() => loadConfig()).toThrow(/cannot read/)
})

test("process names match with a version suffix or a target prefix", () => {
  expect(baseProcessName("clang-22")).toBe("clang")
  expect(baseProcessName("clang++-18")).toBe("clang++")
  expect(baseProcessName("x86_64-linux-gnu-gcc-13")).toBe("gcc")
  expect(baseProcessName("ld.lld")).toBe("ld.lld")
  expect(baseProcessName("kworker/0:1")).toBe("kworker/0:1")
  expect(nameMatches("clang-22", ["clang"])).toBe(true)
  expect(nameMatches("clangd", ["clang"])).toBe(false)
  expect(runningCompilers(["clang-22", "clang-22", "bash", "ld.lld", "cc1plus", "clangd", "make"])).toEqual(["clang-22 x2", "cc1plus", "ld.lld"])
})

test("no_compiler and no_process see versioned compiler names", () => {
  const probe = (names: string[]) => ({ memAvailableKb: () => 1, processNames: () => names })
  expect(checkNow([{ kind: "no_compiler" }], probe(["bash", "clang-22"]))).toBe("compiler running: clang-22")
  expect(checkNow([{ kind: "no_process", names: ["clang"] }], probe(["clang-22"]))).toBe("process running: clang-22")
  expect(checkNow([{ kind: "no_compiler" }], probe(["bash", "clangd"]))).toBeNull()
})
