import path from "node:path";
import { randomUUID } from "node:crypto";
import { connectorFromCsv, connectorFromCsvText, type Connector } from "@gendash/connectors";

/**
 * Data sources for the app.
 *  - the demo dataset (clinical studies) is the default.
 *  - uploaded CSVs are registered by id and selected per request via sourceId.
 *
 * The registry lives on globalThis so it survives dev hot-reloads. It's
 * in-memory (fine for MVP): uploads are lost on restart and not shared across
 * instances — persistence comes with the save/DB milestone.
 */
const g = globalThis as unknown as { __gendashSources?: Map<string, Connector> };
g.__gendashSources ??= new Map<string, Connector>();
const sources = g.__gendashSources;

let demo: Connector | null = null;
function demoConnector(): Connector {
  if (!demo) demo = connectorFromCsv(path.join(process.cwd(), "data", "studies.csv"), "studies");
  return demo;
}

export function getConnector(sourceId?: string): Connector {
  if (sourceId && sources.has(sourceId)) return sources.get(sourceId)!;
  return demoConnector();
}

/** Parse an uploaded CSV, register it, and return its id + inferred schema. */
export async function registerCsv(name: string, csvText: string) {
  const conn = connectorFromCsvText(csvText, name);
  const id = randomUUID();
  sources.set(id, conn);
  // cap memory: drop the oldest once we exceed 50 uploads
  if (sources.size > 50) {
    const oldest = sources.keys().next().value;
    if (oldest) sources.delete(oldest);
  }
  const schema = await conn.schema();
  return { sourceId: id, schema, table: schema[0]?.name };
}
