// Run a command while a ticket holds its lock. The child is recorded on the ticket, so the lock
// stays while the child runs even if the caller is killed, and is freed when both are gone.
import type { Owner, Store } from "./store.ts"

export interface RunOptions {
  cmd: string[]
  maxHoldSec: number
  /** Called with output chunks. Without it the child inherits stdout and stderr. */
  onOutput?: (chunk: string) => void
  signal?: AbortSignal
  cwd?: string
}

/** Exit code 124 means the command ran out of time (like timeout(1)). */
export async function runHeld(store: Store, ticket: string, who: Owner, opts: RunOptions): Promise<{ code: number; timedOut: boolean }> {
  const pipe = !!opts.onOutput
  const child = Bun.spawn(opts.cmd, {
    cwd: opts.cwd,
    stdin: pipe ? "ignore" : "inherit",
    stdout: pipe ? "pipe" : "inherit",
    stderr: pipe ? "pipe" : "inherit",
  })
  store.bindRun(ticket, who, child.pid)
  let timedOut = false
  const kill = (sig: NodeJS.Signals) => {
    try {
      child.kill(sig)
    } catch {}
  }
  const stop = () => {
    kill("SIGTERM")
    setTimeout(() => kill("SIGKILL"), 15_000).unref?.()
  }
  const timer = setTimeout(() => {
    timedOut = true
    stop()
  }, Math.max(1, opts.maxHoldSec) * 1000)
  opts.signal?.addEventListener("abort", stop, { once: true })
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
  await Promise.all(readers)
  clearTimeout(timer)
  opts.signal?.removeEventListener("abort", stop)
  return { code: timedOut ? 124 : code, timedOut }
}
