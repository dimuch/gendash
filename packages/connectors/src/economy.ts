import type { DataSourceSchema } from "@gendash/ai";
import type { Row } from "./types";
import { LiveConnector, fetchJson } from "./live";

/**
 * Global economy demo: World Bank open data (no key). One row per country per
 * year, with GDP, population and life expectancy. Good for time trends
 * ("GDP over years by country"), snapshots ("top 10 countries by GDP in 2021"),
 * and regional roll-ups ("total population by region in 2021").
 *
 * Region aggregates ("World", "High income") are filtered out so rankings show
 * real countries. Fetches four endpoints once, then serves in-memory.
 */
const YEARS = "2015:2022";
const INDICATORS = {
  gdp: "NY.GDP.MKTP.CD",
  population: "SP.POP.TOTL",
  life_expectancy: "SP.DYN.LE00.IN",
} as const;

type Metric = keyof typeof INDICATORS;

export class EconomyConnector extends LiveConnector {
  protected readonly tableName = "economy";
  protected readonly tableSchema: DataSourceSchema = [
    {
      name: "economy",
      columns: [
        { name: "country", type: "string" },
        { name: "region", type: "string" },
        { name: "year", type: "number" },
        { name: "gdp", type: "number" },
        { name: "population", type: "number" },
        { name: "life_expectancy", type: "number" },
      ],
    },
  ];

  protected async fetchRows(): Promise<Row[]> {
    const base = "https://api.worldbank.org/v2";

    // 1) Real countries only (drop region/income aggregates), plus each one's region.
    const countriesRaw = (await fetchJson(
      `${base}/country?format=json&per_page=400`,
      "The economy demo API (World Bank)"
    )) as any[];
    const countryList = Array.isArray(countriesRaw?.[1]) ? countriesRaw[1] : [];
    const region = new Map<string, string>();
    for (const c of countryList) {
      const iso3 = String(c?.id ?? "");
      const reg = String(c?.region?.value ?? "");
      if (iso3 && reg && reg !== "Aggregates") region.set(iso3, reg);
    }

    // 2) Three indicators in parallel.
    const [gdp, population, life] = await Promise.all(
      (Object.keys(INDICATORS) as Metric[]).map((m) =>
        fetchJson(
          `${base}/country/all/indicator/${INDICATORS[m]}?format=json&per_page=20000&date=${YEARS}`,
          "The economy demo API (World Bank)"
        )
      )
    );

    // 3) Join by iso3 + year, keeping only real countries.
    const rows = new Map<string, Row>();
    const ingest = (payload: unknown, metric: Metric) => {
      const list = Array.isArray((payload as any)?.[1]) ? (payload as any)[1] : [];
      for (const d of list) {
        const iso3 = String(d?.countryiso3code ?? "");
        if (!region.has(iso3)) continue;
        if (d?.value == null) continue;
        const year = Number(d?.date);
        const key = `${iso3}|${year}`;
        let row = rows.get(key);
        if (!row) {
          row = {
            country: String(d?.country?.value ?? iso3),
            region: region.get(iso3)!,
            year,
            gdp: 0,
            population: 0,
            life_expectancy: 0,
          };
          rows.set(key, row);
        }
        row[metric] = Number(d.value);
      }
    };
    ingest(gdp, "gdp");
    ingest(population, "population");
    ingest(life, "life_expectancy");

    return [...rows.values()];
  }
}
