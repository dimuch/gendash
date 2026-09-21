import type { Widget } from "@gendash/spec";

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

/**
 * The adapter boundary.
 *
 * `resolveWidget` turns a validated spec widget + its result rows into a
 * normalized, framework-agnostic render model — all the "what do I actually
 * draw" decisions (which key is the value, whether it's multi-series, the pivot)
 * computed ONCE, in pure TypeScript, with no dependency on React, Recharts, or
 * any UI library.
 *
 * Any renderer — your Recharts components, a host app's own chart/table
 * components, a plain HTML string, ECharts, a PNG — consumes this model instead
 * of re-deriving from the spec. That's what makes GenDash "bring your own
 * components": write a function `(ResolvedWidget) -> your UI` and you're done.
 */
export type WidgetKind = "kpi" | "line" | "bar" | "table";

export interface ResolvedWidget {
  kind: WidgetKind;
  title: string;
  /** category / x-axis key present on each data row */
  xKey: string;
  /** key holding the numeric value on each data row (single-series) */
  valueKey: string;
  /** for grouped charts: the series column names after pivoting; else null */
  series: string[] | null;
  /** rows ready to render (pivoted to {x, seriesA, seriesB} when multi-series) */
  data: Row[];
  /** kpi only: the single headline value */
  kpiValue: Cell;
  /** table only: column order */
  columns: string[];
}

/** grouped rows [{x, series, value}] -> [{x, seriesA, seriesB}] */
function pivot(rows: Row[], xKey: string, gKey: string, vKey: string) {
  const byX = new Map<string, Row>();
  const series = new Set<string>();
  for (const r of rows) {
    const xv = String(r[xKey]);
    const s = String(r[gKey]);
    series.add(s);
    const row = byX.get(xv) ?? { [xKey]: r[xKey] };
    row[s] = r[vKey];
    byX.set(xv, row);
  }
  return { data: [...byX.values()], series: [...series] };
}

export function resolveWidget(widget: Widget, rows: Row[]): ResolvedWidget {
  const xKey = widget.query.x;
  const valueKey = rows.length && "value" in rows[0] ? "value" : widget.query.y ?? "value";

  const base: ResolvedWidget = {
    kind: widget.type,
    title: widget.title,
    xKey,
    valueKey,
    series: null,
    data: rows,
    kpiValue: null,
    columns: rows.length ? Object.keys(rows[0]) : [],
  };

  if (widget.type === "kpi") {
    return { ...base, data: [], kpiValue: rows[0]?.value ?? null };
  }

  if ((widget.type === "line" || widget.type === "bar") && widget.query.groupBy) {
    const { data, series } = pivot(rows, xKey, widget.query.groupBy, valueKey);
    return { ...base, data, series };
  }

  return base;
}

/** Convenience: resolve every widget of a spec against its rows. */
export function resolveDashboard(
  widgets: Widget[],
  rowsByWidget: Row[][]
): ResolvedWidget[] {
  return widgets.map((w, i) => resolveWidget(w, rowsByWidget[i] ?? []));
}
