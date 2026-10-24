// Small pure helpers shared by the panel and the status section.

export function duration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "–"
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m${sec % 60 && m < 10 ? ` ${sec % 60}s` : ""}`
  const h = Math.floor(m / 60)
  return `${h}h${m % 60 ? ` ${m % 60}m` : ""}`
}

export function ago(at: number, now: number): string {
  return `${duration(Math.max(0, Math.round((now - at) / 1000)))} ago`
}

export function gb(kb: number | null): string {
  return kb === null ? "–" : `${(kb / 1024 / 1024).toFixed(1)} GB`
}

/** "alice (alice-nick)" or "alice". */
export function who(holder: string, nick: string | null): string {
  return nick && nick !== holder ? `${holder} (${nick})` : holder
}

export type Tone = "neutral" | "success" | "warning" | "error" | "info" | "primary"

export function eventTone(event: string): Tone {
  if (event === "granted") return "success"
  if (event.startsWith("expired")) return "error"
  if (event.startsWith("canceled")) return "warning"
  if (event === "precondition-blocked") return "warning"
  return "neutral"
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "", children: Node[] = []): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  if (children.length) e.append(...children)
  return e
}

export function badge(text: string, tone: Tone = "neutral", title = ""): HTMLSpanElement {
  const b = el("span", `badge ${tone}`, text)
  if (title) b.title = title
  return b
}
