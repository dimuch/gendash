import { MemoryConnector, type Connector } from "@gendash/connectors";
import { sampleSchema, sampleRows } from "./sampleData";

/**
 * The app's single data source. Swap this for:
 *   new PostgresConnector({ connectionString: process.env.DATABASE_URL! })
 * to run against a real read-only Postgres role — nothing else changes.
 */
let connector: Connector | null = null;

export function getConnector(): Connector {
  if (!connector) connector = new MemoryConnector(sampleSchema, sampleRows);
  return connector;
}
