import type { Query } from "@gendash/spec";
import type { ColumnType, DataSourceSchema } from "@gendash/ai";
import type { Connector, Row, RunOptions } from "./types";
import { compileSql } from "./compileSql";

/**
 * Read-only Postgres connector. Requires the `pg` package.
 *
 * Two layers of "read-only": connect with a role that only has SELECT, AND wrap
 * every statement in a READ ONLY transaction with a short timeout so a runaway
 * or malicious query can neither write nor hang the box.
 */
export interface PostgresOptions {
  connectionString: string;
  statementTimeoutMs?: number;
}

export class PostgresConnector implements Connector {
  private pool: any;
  private ready: Promise<void>;

  constructor(private opts: PostgresOptions) {
    this.ready = this.init();
  }

  private async init() {
    // pg is an optional peer with no bundled types; loaded dynamically.
    // webpackIgnore keeps bundlers from resolving it at build time, so the app
    // compiles fine when pg isn't installed (only needed for a real DB).
    // @ts-ignore optional dependency — may not be installed
    const pg: any = await import(/* webpackIgnore: true */ "pg");
    this.pool = new pg.default.Pool({ connectionString: this.opts.connectionString, max: 4 });
  }

  async schema(): Promise<DataSourceSchema> {
    await this.ready;
    const { rows } = await this.pool.query(
      `SELECT table_name, column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position`
    );
    const byTable = new Map<string, { name: string; type: ColumnType }[]>();
    for (const r of rows as any[]) {
      const cols = byTable.get(r.table_name) ?? byTable.set(r.table_name, []).get(r.table_name)!;
      cols.push({ name: r.column_name, type: pgType(r.data_type) });
    }
    return [...byTable].map(([name, columns]) => ({ name, columns }));
  }

  async run(query: Query, opts: RunOptions): Promise<Row[]> {
    await this.ready;
    const { text, params } = compileSql(query, opts.mode);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await client.query(`SET LOCAL statement_timeout = ${this.opts.statementTimeoutMs ?? 5000}`);
      const res = await client.query(text, params);
      await client.query("COMMIT");
      return res.rows as Row[];
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.ready;
    await this.pool.end();
  }
}

function pgType(dataType: string): ColumnType {
  const t = dataType.toLowerCase();
  if (/int|numeric|real|double|decimal|money|serial/.test(t)) return "number";
  if (/bool/.test(t)) return "boolean";
  if (/date|time/.test(t)) return "date";
  return "string";
}
