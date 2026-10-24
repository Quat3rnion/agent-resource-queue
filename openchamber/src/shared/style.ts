// Colours come from the host's --oc-* tokens, so light and dark themes follow the app.
export const BASE_STYLE = `
  html, body { margin: 0; background: transparent; color: var(--oc-fg); font: 12px/1.4 var(--oc-font); }
  * { box-sizing: border-box; }
  .num { font-variant-numeric: tabular-nums; }
  .muted { color: var(--oc-muted); }
  .mono { font-family: var(--oc-mono); }
  .badge { display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 4px; font-size: 10px; font-weight: 600;
    white-space: nowrap; flex: none; background: color-mix(in srgb, var(--oc-fg) 8%, transparent); color: var(--oc-muted); }
  .badge.success { background: color-mix(in srgb, var(--oc-success) 16%, transparent); color: var(--oc-success-text, var(--oc-success)); }
  .badge.warning { background: color-mix(in srgb, var(--oc-warning) 18%, transparent); color: var(--oc-warning-text, var(--oc-warning)); }
  .badge.error { background: color-mix(in srgb, var(--oc-error) 16%, transparent); color: var(--oc-error-text, var(--oc-error)); }
  .badge.info, .badge.primary { background: color-mix(in srgb, var(--oc-primary) 14%, transparent); color: var(--oc-primary-text, var(--oc-primary)); }
  .note { color: var(--oc-muted); padding: 4px 2px; }
  .note.error { color: var(--oc-error-text, var(--oc-error)); }
`

export const PANEL_STYLE = `
  html, body { height: 100%; overflow-y: auto; overflow-x: hidden; }
  #root { display: flex; flex-direction: column; gap: 14px; padding: 12px 12px 20px; }
  .head { display: flex; align-items: flex-start; gap: 8px; }
  .head .titles { min-width: 0; flex: 1; }
  .title { font-size: 13px; font-weight: 600; }
  .meta { color: var(--oc-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .live { display: inline-flex; align-items: center; gap: 6px; color: var(--oc-muted); font-size: 11px; white-space: nowrap; padding-top: 2px; }
  .live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--oc-success); }
  .live.stale::before { background: var(--oc-muted); }
  .hostline { display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--oc-muted); font-size: 11px; }
  .hostline b { color: var(--oc-fg); font-weight: 600; }
  .card { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--oc-radius);
    background: color-mix(in srgb, var(--oc-fg) 4%, transparent); min-width: 0; }
  .card-top { display: flex; align-items: center; gap: 8px; }
  .card-top .name { font-size: 14px; font-weight: 650; }
  .card-top .grow { flex: 1; }
  .slots { display: flex; gap: 3px; }
  .slots span { width: 14px; height: 6px; border-radius: 2px; background: color-mix(in srgb, var(--oc-fg) 12%, transparent); }
  .slots span.on { background: var(--oc-primary); }
  .label { font-size: 10px; font-weight: 600; letter-spacing: .03em; color: var(--oc-muted); text-transform: uppercase; padding-top: 2px; }
  .row { display: flex; flex-direction: column; gap: 3px; padding: 6px 0 6px 10px; border-left: 2px solid var(--rail, var(--oc-border)); }
  .row.held { --rail: var(--oc-primary); }
  .row.bad { --rail: var(--oc-error); }
  .line1 { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .line1 .who { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .line1 .pos { color: var(--oc-muted); width: 18px; flex: none; }
  .line1 .grow { flex: 1; }
  .line1 .time { color: var(--oc-muted); white-space: nowrap; }
  .purpose { color: color-mix(in srgb, var(--oc-fg) 75%, transparent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { color: var(--oc-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar { height: 4px; border-radius: 2px; overflow: hidden; background: color-mix(in srgb, var(--oc-fg) 8%, transparent); }
  .bar span { display: block; height: 100%; background: var(--oc-primary); transition: width .4s ease; }
  .bar span.late { background: var(--oc-warning); }
  .stats { color: var(--oc-muted); font-size: 11px; border-top: 1px solid var(--oc-border); padding-top: 6px; }
  .events { display: flex; flex-direction: column; }
  .event { display: grid; grid-template-columns: 56px 44px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 4px 2px;
    border-bottom: 1px solid color-mix(in srgb, var(--oc-border) 50%, transparent); font-size: 11px; }
  .event .what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .settings { display: flex; gap: 6px; align-items: center; color: var(--oc-muted); font-size: 11px; }
  .settings input { flex: 1; min-width: 0; height: 22px; padding: 0 6px; border-radius: 4px; border: 1px solid var(--oc-border);
    background: transparent; color: var(--oc-fg); font: 11px var(--oc-mono); }
  .settings button { height: 22px; padding: 0 8px; border-radius: 4px; border: 0; cursor: pointer; font: 11px var(--oc-font);
    background: color-mix(in srgb, var(--oc-fg) 8%, transparent); color: var(--oc-fg); }
`

export const STATUS_STYLE = `
  html, body { overflow: hidden; }
  #root { display: flex; flex-direction: column; gap: 4px; padding: 4px 2px; }
  .sline { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 8px; align-items: center; }
  .sline .name { font-weight: 600; }
  .sline .what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sline .what.free { color: var(--oc-muted); }
`
