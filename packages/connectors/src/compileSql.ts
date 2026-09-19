import type { Query, Filter } from "@gendash/spec";
import type { RunMode } from "./types.js";

/**
 * Compile a validated spec Query into parameterised, read-only Postgres SQL.
 *
 * Safety rules, enforced here and nowhere else:
 *  - identifiers (table/column) are whitelisted by shape AND quoted; they came
 *    pre-checked against the real schema, this is defence in depth.
 *  - every filter VALUE is a bound parameter ($1, $2, ...), never interpolated.
 *  - only SELECT is ever produced.
 */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`unsafe identifier: ${JSON.stringify(name)}`);
  return `"${name}"`;
}

const OP_SQL: Record<Filter["op"], string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
  in: "= ANY", // special-cased below
};

export interface CompiledSql {
  text: string;
  params: unknown[];
}

export function compileSql(query: Query, mode: RunMode): CompiledSql {
  const params: unknown[] = [];
  const bind = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  const table = ident(query.table);

  const where = query.filters
    .map((f) => {
      const col = ident(f.column);
      if (f.op === "in") {
        const arr = Array.isArray(f.value) ? f.value : [f.value];
        return `${col} = ANY(${bind(arr)})`;
      }
      return `${col} ${OP_SQL[f.op]} ${bind(f.value)}`;
    })
    .join(" AND ");
  const whereClause = where ? ` WHERE ${where}` : "";

  const aggExpr = () =>
    query.agg === "count" ? "count(*)" : `${query.agg}(${ident(query.y!)})`;

  if (mode === "scalar") {
    return {
      text: `SELECT ${aggExpr()} AS value FROM ${table}${whereClause}`,
      params,
    };
  }

  if (mode === "rows") {
    const cols = [ident(query.x)];
    if (query.y) cols.push(ident(query.y));
    return {
      text: `SELECT ${cols.join(", ")} FROM ${table}${whereClause} LIMIT ${query.limit}`,
      params,
    };
  }

  // grouped
  const groupCols = [ident(query.x)];
  if (query.groupBy) groupCols.push(ident(query.groupBy));
  const selectCols = groupCols.concat(`${aggExpr()} AS value`);
  return {
    text:
      `SELECT ${selectCols.join(", ")} FROM ${table}${whereClause}` +
      ` GROUP BY ${groupCols.join(", ")} ORDER BY ${ident(query.x)} LIMIT ${query.limit}`,
    params,
  };
}
