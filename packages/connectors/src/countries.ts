import type { Query } from "@gendash/spec";
import type { DataSourceSchema } from "@gendash/ai";
import type { Connector, Row, RunOptions } from "./types";
import { MemoryConnector } from "./memory";

/**
 * A free, no-auth live data source for the demo: the mledoze/countries dataset
 * (a stable JSON hosted on GitHub — no API key, no rate limits, no deprecation
 * surprises). One table `countries` with a row per country.
 *
 * Note: this dataset has no population field; the measures are `area`,
 * `languages` (count), and `neighbors` (count of bordering countries). Asking
 * for population triggers the out-of-scope decline, which is correct.
 *
 * Fetched once and cached, then it's just an in-memory connector.
 */
const ENDPOINT = "https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json";

const SCHEMA: DataSourceSchema = [
  {
    name: "countries",
    columns: [
      { name: "country", type: "string" },
      { name: "region", type: "string" },
      { name: "subregion", type: "string" },
      { name: "area", type: "number" },
      { name: "languages", type: "number" },
      { name: "neighbors", type: "number" },
      { name: "landlocked", type: "boolean" },
      { name: "un_member", type: "boolean" },
      { name: "independent", type: "boolean" },
    ],
  },
];

export class CountriesConnector implements Connector {
  private inner: Promise<MemoryConnector> | null = null;

  private load(): Promise<MemoryConnector> {
    if (!this.inner) {
      this.inner = (async () => {
        const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`countries dataset -> ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("countries dataset returned an unexpected shape (not an array)");
        }
        const rows: Row[] = data.map((c: any) => ({
          country: c?.name?.common ?? c?.cca3 ?? "",
          region: c?.region || "Other",
          subregion: c?.subregion || "Other",
          area: Number(c?.area ?? 0),
          languages: c?.languages ? Object.keys(c.languages).length : 0,
          neighbors: Array.isArray(c?.borders) ? c.borders.length : 0,
          landlocked: !!c?.landlocked,
          un_member: !!c?.unMember,
          independent: !!c?.independent,
        }));
        return new MemoryConnector(SCHEMA, { countries: rows });
      })();
    }
    return this.inner;
  }

  async schema(): Promise<DataSourceSchema> {
    return (await this.load()).schema();
  }

  async run(query: Query, opts: RunOptions): Promise<Row[]> {
    return (await this.load()).run(query, opts);
  }
}
