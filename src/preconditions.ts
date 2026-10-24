// Preconditions that must hold before a ticket gets the lock.
import { COMPILERS, memAvailableKb, nameMatches, processNames } from "./proc.ts"

export type Precondition =
  /** MemAvailable must be at least min_kb. */
  | { kind: "mem_available"; min_kb: number; for_sec?: number }
  /** No running process may have one of these names (comm). "clang" also matches "clang-22". */
  | { kind: "no_process"; names: string[]; for_sec?: number }
  /** No compiler, assembler or linker may run (the COMPILERS list in proc.ts). */
  | { kind: "no_compiler"; for_sec?: number }

export interface Probe {
  memAvailableKb(): number | null
  processNames(): string[]
}

export const systemProbe: Probe = { memAvailableKb, processNames }

export function parsePreconditions(raw: unknown): Precondition[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) throw new Error("preconditions must be an array")
  return raw.map((p, i) => {
    if (typeof p !== "object" || p === null) throw new Error(`precondition ${i}: not an object`)
    const r = p as Record<string, unknown>
    const forSec = r.for_sec === undefined ? undefined : num(r.for_sec, `precondition ${i}: for_sec`)
    if (r.kind === "mem_available") return { kind: "mem_available", min_kb: num(r.min_kb, `precondition ${i}: min_kb`), for_sec: forSec }
    if (r.kind === "no_process") {
      if (!Array.isArray(r.names) || !r.names.every((n) => typeof n === "string" && n !== ""))
        throw new Error(`precondition ${i}: names must be a list of process names`)
      return { kind: "no_process", names: r.names as string[], for_sec: forSec }
    }
    if (r.kind === "no_compiler") return { kind: "no_compiler", for_sec: forSec }
    throw new Error(`precondition ${i}: kind must be mem_available, no_process or no_compiler`)
  })
}

function num(v: unknown, what: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new Error(`${what} must be a number >= 0`)
  return v
}

/** Seconds that all preconditions must pass without a break. */
export function requiredSec(pre: Precondition[]): number {
  return Math.max(0, ...pre.map((p) => p.for_sec ?? 0))
}

/** Returns null when all preconditions pass now, else a reason. */
export function checkNow(pre: Precondition[], probe: Probe): string | null {
  let running: string[] | null = null
  for (const p of pre) {
    if (p.kind === "mem_available") {
      const kb = probe.memAvailableKb()
      if (kb === null) return "MemAvailable is not readable"
      if (kb < p.min_kb) return `MemAvailable ${kb} kB < ${p.min_kb} kB`
    } else {
      running ??= probe.processNames()
      const want = p.kind === "no_compiler" ? COMPILERS : p.names
      const found = [...new Set(running.filter((n) => nameMatches(n, want)))]
      if (found.length) return `${p.kind === "no_compiler" ? "compiler" : "process"} running: ${found.join(", ")}`
    }
  }
  return null
}
