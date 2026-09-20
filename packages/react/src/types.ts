import type { Query, Widget } from "@gendash/spec";

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

/** How a widget's query reduces — mirrors the connector's RunMode. */
export type RunMode = "rows" | "grouped" | "scalar";

/** Consumer-supplied: run a validated widget query and return rows. */
export type FetchData = (query: Query, mode: RunMode) => Promise<Row[]>;

/** Consumer-supplied: distinct values of a column, for filter dropdowns. */
export type FetchValues = (table: string, column: string) => Promise<(string | number)[]>;

/** Pick the run mode for a widget from its type + aggregation. */
export function modeForWidget(w: Widget): RunMode {
  if (w.type === "kpi") return "scalar";
  return w.query.agg === "none" ? "rows" : "grouped";
}
