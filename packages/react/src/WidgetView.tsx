"use client";
import type { Widget } from "@gendash/spec";
import { resolveWidget, type Row } from "@gendash/adapter";
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

/**
 * The Recharts adapter: a thin renderer over the framework-agnostic model from
 * @gendash/adapter. All the "what to draw" logic lives in resolveWidget(); this
 * file only maps that model onto Recharts components. A host app with its own
 * chart library writes an equivalent file against the same model.
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
  const m = resolveWidget(widget, rows);

  const body = () => {
    if (loading) return <div className="gd-muted gd-center">…</div>;
    if (!rows || rows.length === 0) return <div className="gd-muted gd-center">No data</div>;

    switch (m.kind) {
      case "kpi":
        return <div className="gd-kpi">{fmt(m.kpiValue)}</div>;

      case "line":
        return (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={m.data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={m.xKey} stroke={AXIS} fontSize={12} tickLine={false} minTickGap={28} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltip} />
              {m.series ? (
                <>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {m.series.map((s, i) => (
                    <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2} dot={m.data.length > 40 ? false : { r: 3 }} />
                  ))}
                </>
              ) : (
                <Line type="monotone" dataKey={m.valueKey} stroke={ACCENT} strokeWidth={2}
                      dot={m.data.length > 40 ? false : { r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m.data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={m.xKey} stroke={AXIS} fontSize={12} tickLine={false} minTickGap={28} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              {m.series ? (
                <>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {m.series.map((s, i) => (
                    <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </>
              ) : (
                <Bar dataKey={m.valueKey} fill={ACCENT} radius={[4, 4, 0, 0]} cursor="pointer"
                     onClick={(d: any) => onSelect?.(m.xKey, d?.payload?.[m.xKey])} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case "table":
        return (
          <div className="gd-tableWrap">
            <table>
              <thead><tr>{m.columns.map((k) => <th key={k}>{k}</th>)}</tr></thead>
              <tbody>
                {m.data.map((r, i) => (
                  <tr key={i}>{m.columns.map((k) => <td key={k}>{fmt(r[k])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className={`gd-widget ${m.kind === "kpi" ? "gd-widget-kpi" : ""}`}>
      <div className="gd-widget-title">{m.title}</div>
      {body()}
      {m.kind === "bar" && onSelect && !m.series && (
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
