import type { Query } from "@gendash/spec";
import type { DataSourceSchema } from "@gendash/ai";
import type { Connector, Row, RunOptions } from "./types";
import { MemoryConnector } from "./memory";

/**
 * A free, no-auth live data source for the demo: the REST Countries API
 * (https://restcountries.com). One table `countries` with a row per country —
 * region/subregion/continent dimensions, population/area measures, and a couple
 * of booleans. Enough for genuinely varied questions with no setup or key.
 *
 * Fetched once and cached; then it's just an in-memory connector, so all the
 * usual group/aggregate/filter/bucket logic works unchanged.
 */
const ENDPOINT =
  "https://restcountries.com/v3.1/all?fields=name,region,subregion,continents,population,area,languages,landlocked,unMember";

const SCHEMA: DataSourceSchema = [
  {
    name: "countries",
    columns: [
      { name: "country", type: "string" },
      { name: "region", type: "string" },
      { name: "subregion", type: "string" },
      { name: "continent", type: "string" },
      { name: "population", type: "number" },
      { name: "area", type: "number" },
      { name: "languages", type: "number" },
      { name: "landlocked", type: "boolean" },
      { name: "un_member", type: "boolean" },
    ],
  },
];

export class CountriesConnector implements Connector {
  private inner: Promise<MemoryConnector> | null = null;

  private load(): Promise<MemoryConnector> {
    if (!this.inner) {
      this.inner = (async () => {
        const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`REST Countries API -> ${res.status}`);
        const data = (await res.json()) as any[];
        const rows: Row[] = data.map((c) => ({
          country: c?.name?.common ?? "",
          region: c?.region ?? "Other",
          subregion: c?.subregion ?? "Other",
          continent: Array.isArray(c?.continents) ? c.continents[0] ?? "Other" : "Other",
          population: Number(c?.population ?? 0),
          area: Number(c?.area ?? 0),
          languages: c?.languages ? Object.keys(c.languages).length : 0,
          landlocked: !!c?.landlocked,
          un_member: !!c?.unMember,
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
