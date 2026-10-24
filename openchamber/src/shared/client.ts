// Polls the service while the frame is on screen. A hidden frame asks nothing.
import { HostRequestError, type HostClient } from "@openchamber/sdk"
import type { Snapshot } from "./snapshot.ts"

export const POLL_MS = 2_000
export const DIR_KEY = "store-dir"

export type PollFailure = "needs-approval" | "paused" | "service-failed" | "unreachable" | "bad-answer"

export const FAILURE_TEXT: Record<PollFailure, string> = {
  "needs-approval": "Allow the local service for Resource Queue in Settings → Extensions.",
  paused: "Resource Queue is paused in Settings → Extensions.",
  "service-failed": "The Resource Queue service stopped. It restarts on the next refresh.",
  unreachable: "Could not reach the Resource Queue service.",
  "bad-answer": "The Resource Queue service answered with something unexpected.",
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null
const isSnapshot = (v: unknown): v is Snapshot =>
  isRecord(v) && typeof v.at === "number" && isRecord(v.store) && isRecord(v.host) && Array.isArray(v.resources) && Array.isArray(v.recent)

const failureOf = (error: unknown): PollFailure => {
  if (!(error instanceof HostRequestError)) return "unreachable"
  if (error.code === "NO_SERVICE" || error.code === "NOT_GRANTED") return "needs-approval"
  if (error.code === "DISABLED") return "paused"
  if (error.code === "SERVICE_FAILED") return "service-failed"
  return "unreachable"
}

export const isOnScreen = (root: HTMLElement): boolean => !document.hidden && root.getBoundingClientRect().width > 0

export async function loadDir(host: HostClient): Promise<string | null> {
  try {
    const v = await host.storage.get(DIR_KEY)
    return typeof v === "string" && v.startsWith("/") ? v : null
  } catch {
    return null
  }
}

export function startPolling(
  host: HostClient,
  root: HTMLElement,
  dir: () => string | null,
  onSnapshot: (s: Snapshot) => void,
  onFailure: (f: PollFailure) => void,
): { refresh: () => void } {
  let inflight = false
  const poll = async (): Promise<void> => {
    if (inflight || !isOnScreen(root)) return
    inflight = true
    try {
      const d = dir()
      const result = await host.serviceRequest({ method: "GET", path: "/snapshot", ...(d ? { query: { dir: d } } : {}) })
      let body: unknown = null
      try {
        body = JSON.parse(result.body)
      } catch {}
      if (result.status === 200 && isSnapshot(body)) onSnapshot(body)
      else onFailure(result.status === 200 ? "bad-answer" : "service-failed")
    } catch (e) {
      onFailure(failureOf(e))
    } finally {
      inflight = false
    }
  }
  void poll()
  setInterval(() => void poll(), POLL_MS)
  let shown = isOnScreen(root)
  const onVisibility = (): void => {
    const next = isOnScreen(root)
    if (next && !shown) void poll()
    shown = next
  }
  document.addEventListener("visibilitychange", onVisibility)
  new ResizeObserver(onVisibility).observe(document.documentElement)
  return { refresh: () => void poll() }
}
