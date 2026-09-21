import type { ResolvedWidget, Row } from "./resolve.js";

/**
 * A reference renderer with ZERO UI-framework dependency: it turns the resolved
 * model into an HTML string. Proof that the render model isn't tied to React or
 * Recharts — the same `ResolvedWidget` drives this, your Recharts components, or
 * a host app's own design system. Swap the theme to change the entire look
 * without touching the data or the spec.
 */
export interface HtmlTheme {
  bg: string;
  panel: string;
  text: string;
  muted: string;
  accent: string;
  line: string;
  radius: string;
}

export const gendashTheme: HtmlTheme = {
  bg: "#0a0f1a", panel: "#0f1826", text: "#e6edf7", muted: "#8899ad",
  accent: "#7cc0ff", line: "rgba(255,255,255,.08)", radius: "14px",
};
export const disqoverTheme: HtmlTheme = {
  bg: "#f4f6f9", panel: "#ffffff", text: "#28323d", muted: "#7a8794",
  accent: "#00a3b4", line: "#e3e8ee", radius: "14px",
};

const fmt = (n: unknown) =>
  typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(n);

function bars(rows: Row[], xKey: string, valueKey: string, t: HtmlTheme): string {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return rows
    .map(
      (r) => `<div style="display:grid;grid-template-columns:110px 1fr 70px;gap:8px;align-items:center;margin:7px 0;font-size:.83rem">
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r[xKey]}</span>
      <span style="background:${t.line};border-radius:5px"><span style="display:block;height:15px;border-radius:5px;width:${Math.max(3, (Number(r[valueKey]) || 0) / max * 100)}%;background:${t.accent}"></span></span>
      <span style="text-align:right;color:${t.muted};font-variant-numeric:tabular-nums">${fmt(r[valueKey])}</span>
    </div>`
    )
    .join("");
}

export function renderWidgetHtml(w: ResolvedWidget, t: HtmlTheme = gendashTheme): string {
  let body = "";
  if (w.kind === "kpi") {
    body = `<div style="font-size:2.6rem;font-weight:700;line-height:1">${fmt(w.kpiValue)}</div>`;
  } else if (w.kind === "table") {
    const head = w.columns.map((c) => `<th style="text-align:left;padding:8px 10px;border-bottom:1px solid ${t.line};color:${t.muted}">${c}</th>`).join("");
    const rows = w.data
      .map((r) => `<tr>${w.columns.map((c) => `<td style="padding:8px 10px;border-bottom:1px solid ${t.line}">${fmt(r[c])}</td>`).join("")}</tr>`)
      .join("");
    body = `<table style="width:100%;border-collapse:collapse;font-size:.85rem"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  } else if (w.series) {
    // multi-series: one labelled bar group per series column
    body = w.series
      .map((s) => `<div style="margin-bottom:10px"><div style="font-size:.75rem;color:${t.muted};margin-bottom:2px">${s}</div>${bars(w.data, w.xKey, s, t)}</div>`)
      .join("");
  } else {
    body = bars(w.data, w.xKey, w.valueKey, t);
  }
  return `<div style="background:${t.panel};border:1px solid ${t.line};border-radius:${t.radius};padding:16px;color:${t.text}">
    <div style="font-size:.85rem;color:${t.muted};margin-bottom:12px">${w.title}</div>${body}</div>`;
}

export function renderDashboardHtml(resolved: ResolvedWidget[], t: HtmlTheme = gendashTheme): string {
  return `<div style="background:${t.bg};padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${resolved
    .map((w) => renderWidgetHtml(w, t))
    .join("")}</div>`;
}
