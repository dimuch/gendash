import type { Query, Filter, Aggregation } from "@gendash/spec";
import type { DataSourceSchema } from "@gendash/ai";
import type { Connector, Row, Cell, RunOptions } from "./types.js";

/**
 * In-memory connector — executes a validated Query directly in JS.
 * Backs the offline demo (hardcoded rows) and the CSV/JSON upload path.
 * Its semantics match compileSql() exactly, so swapping to Postgres changes
 * nothing about the results.
 */
export class MemoryConnector implements Connector {
  constructor(
    private _schema: DataSourceSchema,
    private tables: Record<string, Row[]>
  ) {}

  async schema(): Promise<DataSourceSchema> {
    return this._schema;
  }

  async run(query: Query, opts: RunOptions): Promise<Row[]> {
    const source = this.tables[query.table];
    if (!source) throw new Error(`no such table loaded: ${query.table}`);

    const rows = source.filter((r) => query.filters.every((f) => match(r, f)));

    if (opts.mode === "scalar") {
      return [{ value: aggregate(query.agg, rows, query.y) }];
    }

    if (opts.mode === "rows") {
      return rows.slice(0, query.limit).map((r) => {
        const out: Row = { [query.x]: r[query.x] };
        if (query.y) out[query.y] = r[query.y];
        return out;
      });
    }

    // grouped
    const groups = new Map<string, Row[]>();
    const keyCols = query.groupBy ? [query.x, query.groupBy] : [query.x];
    for (const r of rows) {
      const key = keyCols.map((c) => String(r[c])).join("\u0000");
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
    }
    const result: Row[] = [];
    for (const [, grp] of groups) {
      const out: Row = { [query.x]: grp[0][query.x] };
      if (query.groupBy) out[query.groupBy] = grp[0][query.groupBy];
      out.value = aggregate(query.agg, grp, query.y);
      result.push(out);
    }
    result.sort((a, b) => cmp(a[query.x], b[query.x]));
    return result.slice(0, query.limit);
  }
}

function match(row: Row, f: Filter): boolean {
  const v = row[f.column];
  switch (f.op) {
    case "eq": return v === f.value;
    case "neq": return v !== f.value;
    case "gt": return num(v) > num(f.value);
    case "lt": return num(v) < num(f.value);
    case "gte": return num(v) >= num(f.value);
    case "lte": return num(v) <= num(f.value);
    case "in": return (Array.isArray(f.value) ? f.value : [f.value]).includes(v as never);
  }
}

function aggregate(agg: Aggregation, rows: Row[], y?: string): number {
  if (agg === "count") return rows.length;
  if (!y) return rows.length;
  const nums = rows.map((r) => num(r[y])).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return 0;
  switch (agg) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    default: return nums.length;
  }
}

function num(v: Cell): number {
  return typeof v === "number" ? v : Number(v);
}

function cmp(a: Cell, b: Cell): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
