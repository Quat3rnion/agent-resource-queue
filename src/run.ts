// Run a command while a ticket holds its lock. The command runs in its own session, which is recorded
// on the ticket: the lock stays while any process of that session runs, even if the caller is killed.
// On timeout, abort or exit, the whole session is stopped before the caller releases the lock.
import type { Owner, Store } from "./store.ts"
import { sessionMembers } from "./proc.ts"

export interface RunOptions {
  cmd: string[]
  maxHoldSec: number
  /** Called with output chunks. Without it the child inherits stdout and stderr. */
  onOutput?: (chunk: string) => void
  signal?: AbortSignal
  cwd?: string
  /** Time between TERM and KILL when the command is stopped. Default 15 s. */
  graceMs?: number
}

/** Exit code 124 means the command ran out of time (like timeout(1)). */
export async function runHeld(store: Store, ticket: string, who: Owner, opts: RunOptions): Promise<{ code: number; timedOut: boolean }> {
  const pipe = !!opts.onOutput
  const grace = opts.graceMs ?? 15_000
  // A new session (setsid): everything the command starts keeps this session ID, also after its parent
  // dies and it is reparented. The session is what we stop, and what keeps the lock alive.
  const child = Bun.spawn(opts.cmd, {
    cwd: opts.cwd,
    detached: true,
    stdin: pipe ? "ignore" : "inherit",
    stdout: pipe ? "pipe" : "inherit",
    stderr: pipe ? "pipe" : "inherit",
  })
  const sid = child.pid
  store.bindRun(ticket, who, sid)
  let timedOut = false
  let stopping: Promise<void> | null = null
  const stop = () => (stopping ??= stopSession(sid, grace))
  const timer = setTimeout(() => {
    timedOut = true
    void stop()
  }, Math.max(1, opts.maxHoldSec) * 1000)
  const onAbort = () => void stop()
  opts.signal?.addEventListener("abort", onAbort, { once: true })
  const readers: Promise<void>[] = []
  if (pipe) {
    for (const s of [child.stdout, child.stderr] as ReadableStream<Uint8Array>[]) {
      readers.push((async () => {
        const dec = new TextDecoder()
        for await (const chunk of s) opts.onOutput!(dec.decode(chunk, { stream: true }))
      })())
    }
  }
  const code = await child.exited
  clearTimeout(timer)
  opts.signal?.removeEventListener("abort", onAbort)
  // Processes that the command left behind (background jobs, orphaned compilers) end with it, before the
  // caller releases the lock. They also hold the output pipes open, so stop them before reading to the end.
  await stop()
  await Promise.all(readers)
  return { code: timedOut ? 124 : code, timedOut }
}

/** TERM every process in the session, KILL what is left after `graceMs`, and wait until none is left. */
export async function stopSession(sid: number, graceMs: number): Promise<void> {
  const signal = (sig: NodeJS.Signals) => {
    for (const pid of sessionMembers(sid)) {
      try {
        process.kill(pid, sig)
      } catch {}
    }
  }
  if (!sessionMembers(sid).length) return
  signal("SIGTERM")
  const end = Date.now() + graceMs
  while (sessionMembers(sid).length && Date.now() < end) await Bun.sleep(100)
  for (let i = 0; i < 50 && sessionMembers(sid).length; i++) {
    signal("SIGKILL")
    await Bun.sleep(100)
  }
}
