import { randomUUID } from "node:crypto";
import { connectorFromCsvText, CountriesConnector, DisqoverConnector, type Connector } from "@gendash/connectors";

/**
 * Data sources for the app.
 *  - default: a free, no-auth live API (REST Countries) so anyone can ask
 *    varied questions immediately. Set DISQOVER_URL to use a Disqover instance.
 *  - uploaded CSVs are registered by id and selected per request via sourceId.
 *    We keep the raw CSV alongside the connector so a saved dashboard can be
 *    made self-contained.
 *
 * In-memory (fine for MVP): uploads are lost on restart and not shared across
 * instances — durable persistence comes with the DB milestone.
 */
interface Source {
  connector: Connector;
  csv: string;
  table: string;
}

const g = globalThis as unknown as { __gendashSources?: Map<string, Source> };
g.__gendashSources ??= new Map<string, Source>();
const sources = g.__gendashSources;

let demo: Connector | null = null;
function demoConnector(): Connector {
  if (!demo) {
    if (process.env.DISQOVER_URL) {
      // Live Disqover instance when configured (put creds in .env.local).
      demo = new DisqoverConnector({
        baseUrl: process.env.DISQOVER_URL,
        token: process.env.DISQOVER_TOKEN,
        cookie: process.env.DISQOVER_COOKIE,
        version: process.env.DISQOVER_VERSION,
      });
    } else {
      demo = new CountriesConnector(); // free, no-auth live demo
    }
  }
  return demo;
}

export function getConnector(sourceId?: string): Connector {
  if (sourceId && sources.has(sourceId)) return sources.get(sourceId)!.connector;
  return demoConnector();
}

/** Raw CSV + table for a source, so a save can capture it. */
export function getSource(sourceId?: string): Source | undefined {
  return sourceId ? sources.get(sourceId) : undefined;
}

/** Parse an uploaded CSV, register it, and return its id + inferred schema. */
export async function registerCsv(name: string, csvText: string) {
  const connector = connectorFromCsvText(csvText, name);
  const schema = await connector.schema();
  const table = schema[0]?.name ?? "data";
  const id = randomUUID();
  sources.set(id, { connector, csv: csvText, table });
  if (sources.size > 50) {
    const oldest = sources.keys().next().value;
    if (oldest) sources.delete(oldest);
  }
  return { sourceId: id, schema, table };
}
