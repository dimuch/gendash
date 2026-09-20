"use client";
import type { Widget } from "@gendash/spec";
import type { Row } from "./types.js";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const ACCENT = "#7cc0ff";
const GRID = "rgba(255,255,255,0.08)";
const AXIS = "#8899ad";
const COLORS = ["#7cc0ff", "#a98bff", "#ff9bd6", "#7cf0c0", "#ffd27c", "#ff8f6b"];

const fmt = (n: unknown) =>
  typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(n);

/** Pivot grouped rows [{x, series, value}] -> [{x, seriesA, seriesB}] for multi-line charts. */
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

/**
 * The renderer — a validated spec widget + result rows become a chart.
 * It only reads the spec's declared keys, so it draws any widget in the
 * catalogue without special-casing.
 */
export function WidgetView({
  widget,
  rows,
  loading,
  onSelect,
}: {
  widget: Widget;
  rows: Row[];
  loading?: boolean;
  onSelect?: (column: string, value: string | number) => void;
}) {
  const xKey = widget.query.x;
  const yKey =
    rows && rows.length && "value" in rows[0] ? "value" : widget.query.y ?? "value";

  const body = () => {
    if (loading) return <div className="gd-muted gd-center">…</div>;
    if (!rows || rows.length === 0) return <div className="gd-muted gd-center">No data</div>;

    switch (widget.type) {
      case "kpi":
        return <div className="gd-kpi">{fmt(rows[0]?.value)}</div>;

      case "line": {
        const gKey = widget.query.groupBy;
        const p = gKey ? pivot(rows, xKey, gKey, yKey) : null;
        const data = p ? p.data : rows;
        return (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} stroke={AXIS} fontSize={12} tickLine={false} minTickGap={28} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltip} />
              {p ? (
                <>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {p.series.map((s, i) => (
                    <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2} dot={data.length > 40 ? false : { r: 3 }} />
                  ))}
                </>
              ) : (
                <Line type="monotone" dataKey={yKey} stroke={ACCENT} strokeWidth={2}
                      dot={data.length > 40 ? false : { r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case "bar": {
        const gKey = widget.query.groupBy;
        const p = gKey ? pivot(rows, xKey, gKey, yKey) : null;
        const data = p ? p.data : rows;
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} stroke={AXIS} fontSize={12} tickLine={false} minTickGap={28} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              {p ? (
                <>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {p.series.map((s, i) => (
                    <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </>
              ) : (
                <Bar dataKey={yKey} fill={ACCENT} radius={[4, 4, 0, 0]} cursor="pointer"
                     onClick={(d: any) => onSelect?.(xKey, d?.payload?.[xKey])} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case "table":
        return (
          <div className="gd-tableWrap">
            <table>
              <thead>
                <tr>{Object.keys(rows[0]).map((k) => <th key={k}>{k}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>{Object.keys(rows[0]).map((k) => <td key={k}>{fmt(r[k])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className={`gd-widget ${widget.type === "kpi" ? "gd-widget-kpi" : ""}`}>
      <div className="gd-widget-title">{widget.title}</div>
      {body()}
      {widget.type === "bar" && onSelect && !widget.query.groupBy && (
        <div className="gd-hint">tip: click a bar to filter</div>
      )}
    </div>
  );
}

const tooltip = {
  background: "#0f1826",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#e6edf7",
  fontSize: 12,
} as const;
