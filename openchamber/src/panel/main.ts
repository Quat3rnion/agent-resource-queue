// Rail panel: every resource with its holders, its queue and its 24 h numbers, the host state
// that preconditions check, and the recent queue events.
import { connectHost } from "@openchamber/sdk"
import { applyHostReady } from "@openchamber/sdk/ui"
import { DIR_KEY, FAILURE_TEXT, loadDir, startPolling } from "../shared/client.ts"
import { ago, badge, duration, el, eventTone, gb, who } from "../shared/format.ts"
import { STALE_POLL_WARN_SEC, type Holder, type ResourceView, type Snapshot, type Waiter } from "../shared/snapshot.ts"
import { BASE_STYLE, PANEL_STYLE } from "../shared/style.ts"

const host = connectHost()
const root = document.querySelector<HTMLElement>("#root")
if (!root) throw new Error("Missing #root")
const style = document.createElement("style")
style.textContent = BASE_STYLE + PANEL_STYLE
document.head.append(style)

const title = el("div", "title", "Resource Queue")
const meta = el("div", "meta", "Reading…")
const live = el("div", "live stale", "Starting")
const head = el("div", "head", "", [el("div", "titles", "", [title, meta]), live])
const note = el("div", "note")
note.hidden = true
const hostLine = el("div", "hostline")
const body = el("div")
body.style.cssText = "display:flex;flex-direction:column;gap:12px"
const eventsHead = el("div", "label", "Recent events")
const events = el("div", "events")

let dir: string | null = null
const dirInput = el("input")
dirInput.placeholder = "default store"
dirInput.spellcheck = false
const save = el("button", "", "Save")
save.type = "button"
const settings = el("div", "settings", "", [el("span", "", "Store"), dirInput, save])

root.append(head, note, hostLine, body, eventsHead, events, settings)

function holderRow(h: Holder): HTMLElement {
  const bad = h.alive === false
  const row = el("div", `row held${bad ? " bad" : ""}`)
  const badges: Node[] = []
  if (h.exclusive) badges.push(badge("exclusive", "info", "Uses all slots of the resource"))
  if (h.backfill) badges.push(badge("backfill", "info", "Started early while holders drain for a waiting exclusive ticket. It must end before they must end."))
  if (!h.claimed) badges.push(badge("not seen", "warning", "Granted, but the owner has not seen the grant yet"))
  if (bad) badges.push(badge("owner dead", "error", `Processes ${h.pids.join(", ")} are gone. The next check frees the lock.`))
  const time = el("span", "time num", `${duration(h.heldSec)} · ${duration(h.leftSec)} left`)
  time.title = `Held ${duration(h.heldSec)} of max ${duration(h.maxHoldSec)}`
  const line1 = el("div", "line1", "", [el("span", "who", who(h.holder, h.nick)), ...badges, el("span", "grow"), time])
  const purpose = el("div", "purpose", h.purpose || "–")
  purpose.title = h.purpose
  const share = h.maxHoldSec ? Math.min(100, (h.heldSec / h.maxHoldSec) * 100) : 0
  const fill = el("span", share > 80 ? "late" : "")
  fill.style.width = `${share}%`
  const sub = el("div", "sub mono", [h.ticket, h.session, h.pids.length ? `pid ${h.pids.join("/")}` : null].filter(Boolean).join(" · "))
  row.append(line1, purpose, el("div", "bar", "", [fill]), sub)
  return row
}

function waiterRow(w: Waiter): HTMLElement {
  const bad = w.alive === false
  const row = el("div", `row${bad ? " bad" : ""}`)
  const badges: Node[] = []
  if (w.exclusive) badges.push(badge("exclusive", "info", "Waits until all slots are free"))
  if (w.pendingReason?.startsWith("precondition")) badges.push(badge("blocked", "warning", w.pendingReason))
  if (w.lastPollSec > STALE_POLL_WARN_SEC) badges.push(badge(`no poll ${duration(w.lastPollSec)}`, "warning", "The owner has not polled this ticket. It expires after 15 min without a poll."))
  if (bad) badges.push(badge("owner dead", "error", "The owner process is gone. The next check removes the ticket."))
  const line1 = el("div", "line1", "", [
    el("span", "pos num", `#${w.position}`), el("span", "who", who(w.holder, w.nick)), ...badges, el("span", "grow"),
    el("span", "time num", `waiting ${duration(w.waitedSec)}`),
  ])
  const purpose = el("div", "purpose", w.purpose || "–")
  purpose.title = w.purpose
  row.append(line1, purpose)
  const detail = [w.pendingReason, w.preconditions.length ? `needs ${w.preconditions.join("; ")}` : null].filter(Boolean).join(" · ")
  if (detail) row.append(el("div", "sub", detail))
  row.append(el("div", "sub mono", [w.ticket, w.session].filter(Boolean).join(" · ")))
  return row
}

function resourceCard(r: ResourceView): HTMLElement {
  const slots = el("div", "slots")
  for (let i = 0; i < r.capacity; i++) slots.append(el("span", i < r.used ? "on" : ""))
  slots.title = `${r.used} of ${r.capacity} slots in use`
  const state = r.used >= r.capacity ? badge("full", "primary") : r.used ? badge(`${r.used}/${r.capacity}`, "primary") : badge("free", "success")
  const top = el("div", "card-top", "", [el("span", "name", r.name), state, el("span", "grow"),
    r.queue.length ? el("span", "muted", `${r.queue.length} waiting`) : el("span"), slots])
  const card = el("div", "card", "", [top])
  if (r.holders.length) card.append(el("div", "label", "Holders"), ...r.holders.map(holderRow))
  if (r.queue.length) card.append(el("div", "label", "Queue"), ...r.queue.map(waiterRow))
  const s = r.stats
  const parts = [`${s.grants} grants`]
  if (s.meanWaitSec !== null) parts.push(`wait ${duration(s.meanWaitSec)} mean, ${duration(s.maxWaitSec)} max`)
  if (s.meanHoldSec !== null) parts.push(`hold ${duration(s.meanHoldSec)} mean`)
  if (s.expired) parts.push(`${s.expired} expired`)
  if (s.canceled) parts.push(`${s.canceled} canceled`)
  card.append(el("div", "stats", `Last 24 h: ${parts.join(" · ")}`))
  return card
}

function render(s: Snapshot): void {
  live.className = "live"
  live.textContent = "Live"
  if (!dir) dirInput.placeholder = s.store.dir || "default store"
  meta.textContent = `${s.host.name} · ${s.store.dir}`
  meta.title = s.store.dir
  note.hidden = s.store.ok
  note.className = "note error"
  note.textContent = s.store.error ?? ""
  hostLine.replaceChildren(
    el("span", "", "", [document.createTextNode("Memory available "), el("b", "num", gb(s.host.memAvailableKb)), document.createTextNode(` of ${gb(s.host.memTotalKb)}`)]),
    el("span", "", "", [document.createTextNode("Compilers "), el("b", "", s.host.compilers.length ? s.host.compilers.join(", ") : "none")]),
  )
  body.replaceChildren(...(s.resources.length ? s.resources.map(resourceCard) : [el("div", "note", s.store.ok ? "No resources yet." : "")]))
  eventsHead.hidden = !s.recent.length
  events.replaceChildren(...s.recent.map((e) => {
    const what = el("span", "what", `${who(e.holder, e.nick)}${e.durationSec !== null ? ` · ${duration(e.durationSec)}` : ""}${e.detail ? ` · ${e.detail}` : ""}`)
    what.title = [e.ticket, e.purpose, e.detail].filter(Boolean).join("\n")
    const t = el("span", "muted num", ago(e.at, s.at))
    t.title = new Date(e.at).toLocaleString()
    return el("div", "event", "", [t, el("span", "muted", e.resource), what, badge(e.event.replace(/ \((held|waiting)\)$/, ""), eventTone(e.event), e.event)])
  }))
}

let mounted = false
host.onReady((ctx) => {
  applyHostReady(ctx, document.documentElement)
  if (mounted) return
  mounted = true
  void loadDir(host).then((d) => {
    dir = d
    dirInput.value = d ?? ""
    const poller = startPolling(host, root, () => dir, render, (f) => {
      live.className = "live stale"
      live.textContent = "Stopped"
      note.hidden = false
      note.className = "note error"
      note.textContent = FAILURE_TEXT[f]
    })
    save.addEventListener("click", () => {
      const v = dirInput.value.trim()
      if (v && !v.startsWith("/")) {
        void host.toast({ kind: "error", message: "The store directory must be an absolute path." }).catch(() => {})
        return
      }
      dir = v || null
      void (dir ? host.storage.set(DIR_KEY, dir) : host.storage.delete(DIR_KEY)).catch(() => {})
      poller.refresh()
    })
  })
})
