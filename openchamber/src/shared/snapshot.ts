// What the service sends to the panel and the Work Status section.

export interface Holder {
  ticket: string
  holder: string
  nick: string | null
  session: string | null
  purpose: string
  exclusive: boolean
  /** Started out of FIFO order while holders drained for a waiting exclusive ticket. */
  backfill: boolean
  heldSec: number
  maxHoldSec: number
  /** Seconds until max_hold_sec frees the lock. */
  leftSec: number
  /** False: granted, but the owner has not seen it yet. */
  claimed: boolean
  /** False: all owner processes are dead; the next check frees the lock. Null: no process known or another host. */
  alive: boolean | null
  pids: number[]
}

export interface Waiter {
  position: number
  ticket: string
  holder: string
  nick: string | null
  session: string | null
  purpose: string
  exclusive: boolean
  waitedSec: number
  /** Seconds since the owner last polled the ticket. */
  lastPollSec: number
  pendingReason: string | null
  preconditions: string[]
  alive: boolean | null
}

export interface Stats {
  grants: number
  meanWaitSec: number | null
  maxWaitSec: number | null
  meanHoldSec: number | null
  expired: number
  canceled: number
}

export interface ResourceView {
  name: string
  capacity: number
  /** Slots in use; an exclusive holder uses all of them. */
  used: number
  holders: Holder[]
  queue: Waiter[]
  stats: Stats
}

export interface EventView {
  at: number
  resource: string
  event: string
  ticket: string
  holder: string
  nick: string | null
  purpose: string | null
  durationSec: number | null
  detail: string | null
}

export interface Snapshot {
  at: number
  store: { dir: string; ok: boolean; error: string | null }
  host: { name: string; memAvailableKb: number | null; memTotalKb: number | null; compilers: string[] }
  resources: ResourceView[]
  recent: EventView[]
}

export const STATS_WINDOW_SEC = 24 * 3600
export const STALE_POLL_WARN_SEC = 300
