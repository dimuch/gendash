import type { Query } from "@gendash/spec";
import type { DataSourceSchema } from "@gendash/ai";

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

/**
 * How a widget's query should reduce:
 *  - "rows"     : return raw selected columns (agg === "none")
 *  - "grouped"  : one row per x (and optional groupBy) with an aggregated `value`
 *  - "scalar"   : a single aggregated `value` over the whole filtered set (KPI)
 */
export type RunMode = "rows" | "grouped" | "scalar";

export interface RunOptions {
  mode: RunMode;
}

/**
 * One interface, many sources. Every connector receives a spec `Query` that has
 * ALREADY passed Zod + schema validation. The connector's job is only to run it
 * safely — parameterised and read-only. It never sees the AI or the question.
 */
export interface Connector {
  /** Table + column names/types the planner is allowed to see (never rows). */
  schema(): Promise<DataSourceSchema>;
  /** Execute a validated query. */
  run(query: Query, opts: RunOptions): Promise<Row[]>;
  /** Release any resources (pool, file handle). */
  close?(): Promise<void>;
}

/** Pick the run mode for a widget from its type. */
export function modeForWidget(type: "line" | "bar" | "kpi" | "table", agg: string): RunMode {
  if (type === "kpi") return "scalar";
  return agg === "none" ? "rows" : "grouped";
}
