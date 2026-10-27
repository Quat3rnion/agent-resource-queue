// Linux /proc helpers: process identity (PID plus start time), process names, memory.
import { readFileSync, readdirSync } from "node:fs"
import { hostname } from "node:os"

export const HOST = hostname()

/** Start time of a process in clock ticks since boot (field 22 of /proc/<pid>/stat), or null. */
export function pidStartTime(pid: number): string | null {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8")
    // comm (field 2) can hold spaces and parens; the fields after the last ")" are fixed.
    const rest = stat.slice(stat.lastIndexOf(")") + 2).split(" ")
    return rest[19] ?? null // field 22 is index 19 after state (field 3)
  } catch {
    return null
  }
}

/** True when the process exists and has the same start time (so the PID was not reused). */
export function processAlive(pid: number, startTime: string | null): boolean {
  const now = pidStartTime(pid)
  if (now === null) return false
  return startTime === null || now === startTime
}

/** Names (comm) of all running processes. */
export function processNames(): string[] {
  const names: string[] = []
  let entries: string[]
  try {
    entries = readdirSync("/proc")
  } catch {
    return names
  }
  for (const e of entries) {
    if (!/^\d+$/.test(e)) continue
    try {
      names.push(readFileSync(`/proc/${e}/comm`, "utf8").trim())
    } catch {}
  }
  return names
}

/**
 * Name without version suffix and target prefix, so that one name matches all variants:
 * "clang-22" -> "clang", "x86_64-linux-gnu-gcc-13" -> "gcc", "ld.lld" stays "ld.lld".
 * /proc/<pid>/comm is cut to 15 characters, so long names arrive cut.
 */
export function baseProcessName(comm: string): string {
  const n = comm.replace(/-\d+(\.\d+)*$/, "")
  const m = /^(?:[a-z0-9_]+-){2,4}(gcc|g\+\+|cc|c\+\+|as|ld(?:\.[a-z]+)?|clang(?:\+\+)?)$/.exec(n)
  return m ? m[1]! : n
}

/** True when a running process name (comm) is one of these names, with or without a version or target. */
export function nameMatches(comm: string, names: Iterable<string>): boolean {
  const base = baseProcessName(comm)
  for (const n of names) if (n === comm || n === base) return true
  return false
}

/** Compiler, assembler and linker processes (base names; see baseProcessName). */
export const COMPILERS = [
  "hipcc", "nvcc", "rustc", "clang", "clang++", "clang-offload-b", "cc1", "cc1plus", "cc1obj", "cc", "c++", "gcc", "g++",
  "collect2", "as", "ld", "ld.lld", "ld.bfd", "ld.gold", "ld.mold", "lld", "mold",
]

/** Running compilers with their count, e.g. ["clang-22 x6", "ld.lld"]. */
export function runningCompilers(names: string[] = processNames()): string[] {
  const counts = new Map<string, number>()
  for (const n of names) if (nameMatches(n, COMPILERS)) counts.set(n, (counts.get(n) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n, c]) => (c > 1 ? `${n} x${c}` : n))
}

/** MemAvailable in kB, or null when /proc/meminfo is not readable. */
export function memAvailableKb(): number | null {
  try {
    const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(readFileSync("/proc/meminfo", "utf8"))
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
}

/** PIDs of all live processes in session `sid` (field 6 of /proc/<pid>/stat). Zombies do not count. */
export function sessionMembers(sid: number): number[] {
  const out: number[] = []
  let entries: string[]
  try {
    entries = readdirSync("/proc")
  } catch {
    return out
  }
  for (const e of entries) {
    if (!/^\d+$/.test(e)) continue
    try {
      const stat = readFileSync(`/proc/${e}/stat`, "utf8")
      const rest = stat.slice(stat.lastIndexOf(")") + 2).split(" ")
      if (rest[0] !== "Z" && Number(rest[3]) === sid) out.push(Number(e))
    } catch {}
  }
  return out
}

/** SIGKILL every process in session `sid`. Returns how many got the signal. */
export function killSession(sid: number): number {
  let n = 0
  for (const pid of sessionMembers(sid)) {
    try {
      process.kill(pid, "SIGKILL")
      n++
    } catch {}
  }
  return n
}

export interface TicketProcesses {
  owner_pid: number | null
  owner_start: string | null
  run_pid: number | null
  run_start: string | null
}

/** True when the ticket has known processes and all of them are dead. */
export function ownersDead(t: TicketProcesses): boolean {
  const procs: [number, string | null][] = []
  if (t.owner_pid !== null) procs.push([t.owner_pid, t.owner_start])
  if (t.run_pid !== null) procs.push([t.run_pid, t.run_start])
  if (procs.length === 0) return false
  if (procs.some(([pid, start]) => processAlive(pid, start))) return false
  // The command runs in its own session (run_pid is its ID). Processes it started may outlive it.
  return t.run_pid === null || sessionMembers(t.run_pid).length === 0
}
