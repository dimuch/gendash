import path from "node:path";
import { connectorFromCsv, type Connector } from "@gendash/connectors";

/**
 * The app's data source. Currently a CSV of daily prices for two tickers —
 * table `prices` with columns date, symbol, open, high, low, close, volume
 * (symbol is "U" for Unity, "RBLX" for Roblox). groupBy symbol to compare them.
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
    connector = connectorFromCsv(path.join(process.cwd(), "data", "prices.csv"), "prices");
  }
  return connector;
}
