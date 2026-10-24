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

/** MemAvailable in kB, or null when /proc/meminfo is not readable. */
export function memAvailableKb(): number | null {
  try {
    const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(readFileSync("/proc/meminfo", "utf8"))
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
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
  return procs.length > 0 && procs.every(([pid, start]) => !processAlive(pid, start))
}
