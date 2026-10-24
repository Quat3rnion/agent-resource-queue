// Where the store and the optional migration flocks are. One resolver for the plugin, the CLI,
// the shell scripts and the OpenChamber service, so they all find the same store.
//
// Store directory, first match wins:
//   1. an explicit option (plugin option `dir`, CLI `--dir`, panel setting)
//   2. $RESOURCE_QUEUE_DIR
//   3. "dir" in $XDG_CONFIG_HOME/resource-queue/config.json (default ~/.config/resource-queue/config.json)
//   4. $XDG_STATE_HOME/resource-queue (default ~/.local/state/resource-queue)
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

export interface Config {
  dir?: string
  /** Extra flock files that the shell scripts also take, for old callers during a migration. */
  flocks?: { gpu?: string; build?: string }
}

const home = () => process.env.HOME || homedir()
const expand = (p: string) => (p === "~" ? home() : p.startsWith("~/") ? join(home(), p.slice(2)) : resolve(p))

export function configPath(): string {
  return join(process.env.XDG_CONFIG_HOME || join(home(), ".config"), "resource-queue", "config.json")
}

export function loadConfig(path = configPath()): Config {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, "utf8"))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {}
    throw new Error(`resource-queue: cannot read ${path}: ${(e as Error).message}`)
  }
  const c = (raw ?? {}) as Record<string, unknown>
  const f = (c.flocks ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? expand(v.trim()) : undefined)
  return { dir: str(c.dir), flocks: { gpu: str(f.gpu), build: str(f.build) } }
}

export function defaultDir(config: Config = loadConfig()): string {
  const env = process.env.RESOURCE_QUEUE_DIR?.trim()
  if (env) return expand(env)
  if (config.dir) return config.dir
  return join(process.env.XDG_STATE_HOME || join(home(), ".local", "state"), "resource-queue")
}

/** Flock for the "gpu" or "build" scripts: $GPU_FLOCK / $BUILD_FLOCK, then the config. Empty env turns it off. */
export function flockFor(kind: "gpu" | "build", config: Config = loadConfig()): string | null {
  const env = process.env[kind === "gpu" ? "GPU_FLOCK" : "BUILD_FLOCK"]
  if (env !== undefined) return env.trim() ? expand(env.trim()) : null
  return config.flocks?.[kind] ?? null
}
