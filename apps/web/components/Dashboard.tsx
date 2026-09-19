"use client";
import { useCallback, useEffect, useState } from "react";
import type { DashboardSpec, Widget } from "@gendash/spec";
import { WidgetView } from "./renderer/WidgetView";
import { QuestionBar } from "./QuestionBar";

type Row = Record<string, string | number | boolean | null>;
type Mode = "rows" | "grouped" | "scalar";

function modeFor(w: Widget): Mode {
  if (w.type === "kpi") return "scalar";
  return w.query.agg === "none" ? "rows" : "grouped";
}

export function Dashboard() {
  const [spec, setSpec] = useState<DashboardSpec | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [data, setData] = useState<Record<number, { rows: Row[]; loading: boolean }>>({});
  const [options, setOptions] = useState<Record<string, (string | number)[]>>({});

  const ask = useCallback(async (question: string) => {
    setSpecLoading(true);
    setError(null);
    setFilters({});
    setData({});
    setOptions({});
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "planner failed");
      setSpec(json.spec as DashboardSpec);
    } catch (e) {
      setSpec(null);
      setError((e as Error).message);
    } finally {
      setSpecLoading(false);
    }
  }, []);

  // load filter options when a new spec arrives
  useEffect(() => {
    if (!spec) return;
    const table = spec.widgets[0]?.query.table;
    if (!table) return;
    spec.sharedFilters.forEach(async (col) => {
      const res = await fetch(`/api/values?table=${encodeURIComponent(table)}&column=${encodeURIComponent(col)}`);
      if (res.ok) {
        const { values } = await res.json();
        setOptions((o) => ({ ...o, [col]: values }));
      }
    });
  }, [spec]);

  // (re)load each widget's data when spec or filters change
  useEffect(() => {
    if (!spec) return;
    const extra = Object.entries(filters).map(([column, value]) => ({ column, op: "eq" as const, value }));
    spec.widgets.forEach(async (w, i) => {
      setData((d) => ({ ...d, [i]: { rows: d[i]?.rows ?? [], loading: true } }));
      const query = { ...w.query, filters: [...w.query.filters, ...extra] };
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, mode: modeFor(w) }),
      });
      const json = await res.json();
      setData((d) => ({ ...d, [i]: { rows: res.ok ? json.rows : [], loading: false } }));
    });
  }, [spec, filters]);

  const setFilter = (column: string, value: string | number) =>
    setFilters((f) => ({ ...f, [column]: String(value) }));
  const clearFilter = (column: string) =>
    setFilters((f) => { const n = { ...f }; delete n[column]; return n; });

  return (
    <div className="dash">
      <QuestionBar onAsk={ask} loading={specLoading} />

      {error && <div className="error">Couldn’t build that dashboard: {error}</div>}

      {spec && (
        <>
          <div className="dash-head">
            <h2>{spec.title}</h2>
            {spec.sharedFilters.length > 0 && (
              <div className="filters">
                {spec.sharedFilters.map((col) => (
                  <label key={col} className="filter">
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

          <div className="grid">
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
        </>
      )}
    </div>
  );
}
