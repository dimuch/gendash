import path from "node:path";
import { connectorFromCsv, type Connector } from "@gendash/connectors";

/**
 * The app's data source. Currently a CSV of clinical studies (Disqover-style) —
 * table `studies` with columns: id, start_date, phase, status,
 * therapeutic_area, sponsor, country, enrollment, sites.
 *
 * To go back to the toy dataset, swap this for:
 *   import { MemoryConnector } from "@gendash/connectors";
 *   import { sampleSchema, sampleRows } from "./sampleData";
 *   connector = new MemoryConnector(sampleSchema, sampleRows);
 * Or point a PostgresConnector at a real read-only database.
 */
let connector: Connector | null = null;

export function getConnector(): Connector {
  if (!connector) {
    connector = connectorFromCsv(path.join(process.cwd(), "data", "studies.csv"), "studies");
  }
  return connector;
}
