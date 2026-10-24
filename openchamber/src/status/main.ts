// Work Status section: one line per resource with the holder and the queue length.
import { connectHost } from "@openchamber/sdk"
import { applyHostReady } from "@openchamber/sdk/ui"
import { FAILURE_TEXT, loadDir, startPolling } from "../shared/client.ts"
import { badge, duration, el, who } from "../shared/format.ts"
import type { ResourceView, Snapshot } from "../shared/snapshot.ts"
import { BASE_STYLE, STATUS_STYLE } from "../shared/style.ts"

const host = connectHost()
const root = document.querySelector<HTMLElement>("#root")
if (!root) throw new Error("Missing #root")
const style = document.createElement("style")
style.textContent = BASE_STYLE + STATUS_STYLE
document.head.append(style)
root.append(el("div", "note", "Reading…"))

function line(r: ResourceView): HTMLElement {
  const h = r.holders
  let text: string
  if (!h.length) text = "free"
  else if (h.length === 1) text = `${who(h[0]!.holder, h[0]!.nick)} · ${duration(h[0]!.heldSec)}${h[0]!.purpose ? ` · ${h[0]!.purpose}` : ""}`
  else text = `${h.length} holders: ${h.map((x) => x.nick ?? x.holder).join(", ")}`
  const what = el("span", `what${h.length ? "" : " free"}`, text)
  what.title = [...h.map((x) => `held: ${x.holder} – ${x.purpose}`), ...r.queue.map((w) => `#${w.position}: ${w.holder} – ${w.purpose}`)].join("\n")
  const trouble = h.some((x) => x.alive === false) ? badge("owner dead", "error") : r.queue.some((w) => w.pendingReason?.startsWith("precondition")) ? badge("blocked", "warning") : null
  const side = r.queue.length ? badge(`${r.queue.length} waiting`, "warning") : badge(`${r.used}/${r.capacity}`, r.used ? "primary" : "success")
  return el("div", "sline", "", [el("span", "name", r.name), what, trouble ?? side])
}

function render(s: Snapshot): void {
  const shown = s.resources.filter((r) => r.holders.length || r.queue.length || ["gpu", "build"].includes(r.name))
  root!.replaceChildren(...(s.store.ok ? (shown.length ? shown.map(line) : [el("div", "note", "No resources yet.")]) : [el("div", "note", s.store.error ?? "")]))
  void host.setHeight(Math.ceil(root!.getBoundingClientRect().height) + 4).catch(() => {})
}

let mounted = false
host.onReady((ctx) => {
  applyHostReady(ctx, document.documentElement)
  if (mounted) return
  mounted = true
  void loadDir(host).then((d) => {
    startPolling(host, root, () => d, render, (f) => {
      root.replaceChildren(el("div", "note error", FAILURE_TEXT[f]))
    })
  })
})
