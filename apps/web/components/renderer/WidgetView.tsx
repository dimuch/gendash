"use client";
import type { Widget } from "@gendash/spec";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Row = Record<string, string | number | boolean | null>;

const ACCENT = "#7cc0ff";
const GRID = "rgba(255,255,255,0.08)";
const AXIS = "#8899ad";

const fmt = (n: unknown) =>
  typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(n);

/**
 * spec widget + result rows -> a chart. This is the "craft" layer: the renderer
 * only ever reads the validated spec's declared keys (query.x and "value"), so
 * it can draw any widget the catalogue allows without special-casing.
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

  const body = () => {
    if (loading) return <div className="muted center">…</div>;
    if (!rows || rows.length === 0) return <div className="muted center">No data</div>;

    switch (widget.type) {
      case "kpi":
        return <div className="kpi">{fmt(rows[0]?.value)}</div>;

      case "line":
        return (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} stroke={AXIS} fontSize={12} tickLine={false} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} />
              <Tooltip contentStyle={tooltip} />
              <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} stroke={AXIS} fontSize={12} tickLine={false} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} />
              <Tooltip contentStyle={tooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="value"
                fill={ACCENT}
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(d: any) => onSelect?.(xKey, d?.payload?.[xKey])}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "table":
        return (
          <div className="tableWrap">
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
    <div className={`widget ${widget.type === "kpi" ? "widget-kpi" : ""}`}>
      <div className="widget-title">{widget.title}</div>
      {body()}
      {widget.type === "bar" && onSelect && <div className="hint">tip: click a bar to filter</div>}
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
