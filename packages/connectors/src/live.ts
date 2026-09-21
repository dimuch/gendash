import type { Query } from "@gendash/spec";
import type { DataSourceSchema } from "@gendash/ai";
import type { Connector, Row, RunOptions } from "./types";
import { MemoryConnector } from "./memory";

/**
 * Base for a "fetch a public JSON API once, map it to rows, then serve it like
 * an in-memory table" connector. Subclasses only declare a schema and a loader
 * that returns the rows. The fetch is cached for the process lifetime, so the
 * live API is hit at most once per table.
 */
export abstract class LiveConnector implements Connector {
  protected abstract readonly tableName: string;
  protected abstract readonly tableSchema: DataSourceSchema;
  /** Fetch + map the source into rows. */
  protected abstract fetchRows(): Promise<Row[]>;
  /**
   * How long a fetched snapshot stays fresh. Undefined = cache forever (static
   * datasets). Set it for a source whose numbers move (e.g. live prices), so a
   * live dashboard actually sees new values on refresh.
   */
  protected readonly ttlMs?: number;

  private inner: Promise<MemoryConnector> | null = null;
  private loadedAt = 0;

  private load(): Promise<MemoryConnector> {
    const expired = this.ttlMs !== undefined && Date.now() - this.loadedAt > this.ttlMs;
    if (!this.inner || expired) {
      this.loadedAt = Date.now();
      this.inner = (async () => {
        const rows = await this.fetchRows();
        return new MemoryConnector(this.tableSchema, { [this.tableName]: rows });
      })().catch((e) => {
        // Don't cache a failure — let the next request retry the live API.
        this.inner = null;
        throw e;
      });
    }
    return this.inner;
  }

  async schema(): Promise<DataSourceSchema> {
    return this.tableSchema;
  }

  async run(query: Query, opts: RunOptions): Promise<Row[]> {
    return (await this.load()).run(query, opts);
  }
}

/** Small fetch helper with a clear error when a public API is down/rate-limited. */
export async function fetchJson(url: string, label: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(
      `${label} is unavailable right now (${res.status}). Public demo APIs can rate-limit — try again in a moment, or pick another data source.`
    );
  }
  return res.json();
}
