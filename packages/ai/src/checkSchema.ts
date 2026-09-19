import type { DashboardSpec, Query, Aggregation } from "@gendash/spec";
import { DataSourceSchema, findColumn, findTable, ColumnType } from "./dataschema.js";

/**
 * Semantic validation — the step people skip.
 *
 * Zod proves the JSON is well-formed. This proves the AI didn't hallucinate a
 * `revenue` column that doesn't exist, or ask to sum a text column. Every
 * problem found here is fed back to the model verbatim so it can self-correct
 * on the next attempt.
 */

export interface SemanticResult {
  ok: boolean;
  problems: string[];
}

const NUMERIC: ColumnType[] = ["number"];

function checkQuery(
  where: string,
  q: Query,
  schema: DataSourceSchema,
  problems: string[]
) {
  const table = findTable(schema, q.table);
  if (!table) {
    problems.push(`${where}: table "${q.table}" does not exist. Valid tables: ${schema.map((t) => t.name).join(", ")}`);
    return; // no point checking columns against a missing table
  }

  const requireCol = (col: string, role: string) => {
    const c = findColumn(table, col);
    if (!c) {
      problems.push(`${where}: column "${col}" (${role}) not in table "${table.name}". Valid columns: ${table.columns.map((c) => c.name).join(", ")}`);
      return undefined;
    }
    return c;
  };

  requireCol(q.x, "x");

  if (q.agg !== "none") {
    if (!q.y) {
      problems.push(`${where}: agg "${q.agg}" needs a "y" measure column.`);
    } else {
      const yCol = requireCol(q.y, "y");
      if (yCol && needsNumeric(q.agg) && !NUMERIC.includes(yCol.type)) {
        problems.push(`${where}: agg "${q.agg}" needs a numeric "y", but "${q.y}" is ${yCol.type}.`);
      }
    }
  }

  if (q.groupBy) requireCol(q.groupBy, "groupBy");
  for (const f of q.filters) requireCol(f.column, "filter");
}

function needsNumeric(agg: Aggregation) {
  return agg === "sum" || agg === "avg" || agg === "min" || agg === "max";
}

export function checkAgainstSchema(
  spec: DashboardSpec,
  schema: DataSourceSchema
): SemanticResult {
  const problems: string[] = [];

  spec.widgets.forEach((w, i) => {
    const where = `widget[${i}] "${w.title}" (${w.type})`;
    checkQuery(where, w.query, schema, problems);

    // a KPI should reduce to a single number
    if (w.type === "kpi" && w.query.agg === "none") {
      problems.push(`${where}: a kpi must use an aggregation (count/sum/avg/min/max), not "none".`);
    }
  });

  // sharedFilters must be real columns in at least one widget's table
  const tables = spec.widgets.map((w) => findTable(schema, w.query.table)).filter(Boolean);
  for (const col of spec.sharedFilters) {
    const exists = tables.some((t) => t!.columns.some((c) => c.name === col));
    if (!exists) problems.push(`sharedFilter "${col}" is not a column in any widget's table.`);
  }

  return { ok: problems.length === 0, problems };
}
