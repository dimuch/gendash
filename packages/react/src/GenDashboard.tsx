"use client";
import { useEffect, useState } from "react";
import type { DashboardSpec } from "@gendash/spec";
import { WidgetView } from "./WidgetView.js";
import { modeForWidget, type FetchData, type FetchValues, type Row } from "./types.js";

/**
 * The reusable dashboard renderer.
 *
 * Give it a validated spec plus a way to fetch data, and it renders the whole
 * filterable, cross-highlighting dashboard. It is transport-agnostic: the
 * consumer decides where the rows come from (an API route, a direct connector,
 * anything), so the same component works in any React app.
 */
export function GenDashboard({
  spec,
  fetchData,
  fetchValues,
}: {
  spec: DashboardSpec;
  fetchData: FetchData;
  fetchValues?: FetchValues;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [data, setData] = useState<Record<number, { rows: Row[]; loading: boolean }>>({});
  const [options, setOptions] = useState<Record<string, (string | number)[]>>({});

  // reset when a new spec arrives
  useEffect(() => {
    setFilters({});
    setData({});
    setOptions({});
  }, [spec]);

  // load filter options
  useEffect(() => {
    if (!fetchValues) return;
    const table = spec.widgets[0]?.query.table;
    if (!table) return;
    let live = true;
    spec.sharedFilters.forEach(async (col) => {
      const values = await fetchValues(table, col).catch(() => []);
      if (live) setOptions((o) => ({ ...o, [col]: values }));
    });
    return () => { live = false; };
  }, [spec, fetchValues]);

  // (re)load each widget's data when spec or filters change
  useEffect(() => {
    const extra = Object.entries(filters).map(([column, value]) => ({ column, op: "eq" as const, value }));
    let live = true;
    spec.widgets.forEach(async (w, i) => {
      setData((d) => ({ ...d, [i]: { rows: d[i]?.rows ?? [], loading: true } }));
      const query = { ...w.query, filters: [...w.query.filters, ...extra] };
      const rows = await fetchData(query, modeForWidget(w)).catch(() => []);
      if (live) setData((d) => ({ ...d, [i]: { rows, loading: false } }));
    });
    return () => { live = false; };
  }, [spec, filters, fetchData]);

  const setFilter = (column: string, value: string | number) =>
    setFilters((f) => ({ ...f, [column]: String(value) }));
  const clearFilter = (column: string) =>
    setFilters((f) => { const n = { ...f }; delete n[column]; return n; });

  return (
    <div className="gd-dash">
      <div className="gd-dash-head">
        <h2>{spec.title}</h2>
        {spec.sharedFilters.length > 0 && (
          <div className="gd-filters">
            {spec.sharedFilters.map((col) => (
              <label key={col} className="gd-filter">
                <span>{col}</span>
                <select
                  value={filters[col] ?? ""}
                  onChange={(e) => (e.target.value ? setFilter(col, e.target.value) : clearFilter(col))}
                >
                  <option value="">all</option>
                  {(options[col] ?? []).map((v) => (
                    <option key={String(v)} value={String(v)}>{String(v)}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="gd-grid">
        {spec.widgets.map((w, i) => (
          <WidgetView
            key={i}
            widget={w}
            rows={data[i]?.rows ?? []}
            loading={data[i]?.loading}
            onSelect={spec.sharedFilters.includes(w.query.x) ? setFilter : undefined}
          />
        ))}
      </div>
    </div>
  );
}
