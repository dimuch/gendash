import { randomUUID } from "node:crypto";
import {
  connectorFromCsvText,
  CountriesConnector,
  ProductsConnector,
  PeopleConnector,
  CryptoConnector,
  EconomyConnector,
  DisqoverConnector,
  type Connector,
} from "@gendash/connectors";

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

/**
 * Built-in open-API demo datasets across a few business areas. The UI lists
 * these by id; a request carries `sourceId="demo:<id>"` to pick one. Each entry
 * ships example questions so the app can hint at what a dataset can answer.
 */
export interface DemoSource {
  id: string;
  label: string;
  area: string;
  description: string;
  examples: string[];
  make: () => Connector;
}

export const DEMO_SOURCES: DemoSource[] = [
  {
    id: "countries",
    label: "World countries",
    area: "Geography",
    description: "Every country with region, area, languages and neighbours.",
    examples: [
      "total area by region",
      "top 10 largest countries by area",
      "landlocked countries by region",
    ],
    make: () => new CountriesConnector(),
  },
  {
    id: "products",
    label: "Retail products",
    area: "E-commerce",
    description: "A product catalogue with category, brand, price, rating and stock.",
    examples: [
      "average price by category",
      "top 10 products by rating",
      "total stock by brand",
    ],
    make: () => new ProductsConnector(),
  },
  {
    id: "people",
    label: "People & orgs",
    area: "HR",
    description: "A synthetic staff directory with age, city, department and role.",
    examples: [
      "headcount by department",
      "average age by city",
      "people by gender",
    ],
    make: () => new PeopleConnector(),
  },
  {
    id: "crypto",
    label: "Crypto markets",
    area: "Finance",
    description: "The top 100 coins by market cap with price, volume and 24h change.",
    examples: [
      "top 10 coins by market cap",
      "biggest 24h gainers",
      "top coins by trading volume",
    ],
    make: () => new CryptoConnector(),
  },
  {
    id: "economy",
    label: "Global economy",
    area: "Macro",
    description: "World Bank GDP, population and life expectancy by country, 2015–2022.",
    examples: [
      "top 10 countries by gdp in 2021",
      "total population by region in 2021",
      "average life_expectancy by region",
    ],
    make: () => new EconomyConnector(),
  },
];

/** Public catalog (no connector instances) for the client. */
export function demoCatalog() {
  return DEMO_SOURCES.map(({ id, label, area, description, examples }) => ({
    id: `demo:${id}`,
    label,
    area,
    description,
    examples,
  }));
}

// Instantiate each demo connector once (fetch is cached inside the connector).
const g2 = globalThis as unknown as { __gendashDemos?: Map<string, Connector> };
g2.__gendashDemos ??= new Map<string, Connector>();
const demoInstances = g2.__gendashDemos;

function demoById(id: string): Connector | undefined {
  const spec = DEMO_SOURCES.find((d) => d.id === id);
  if (!spec) return undefined;
  let inst = demoInstances.get(id);
  if (!inst) {
    inst = spec.make();
    demoInstances.set(id, inst);
  }
  return inst;
}

let fallback: Connector | null = null;
function fallbackConnector(): Connector {
  if (!fallback) {
    if (process.env.DISQOVER_URL) {
      // Live Disqover instance when configured (put creds in .env.local).
      fallback = new DisqoverConnector({
        baseUrl: process.env.DISQOVER_URL,
        token: process.env.DISQOVER_TOKEN,
        cookie: process.env.DISQOVER_COOKIE,
        version: process.env.DISQOVER_VERSION,
      });
    } else {
      fallback = demoById("countries")!; // free, no-auth live demo
    }
  }
  return fallback;
}

export function getConnector(sourceId?: string): Connector {
  if (sourceId) {
    if (sources.has(sourceId)) return sources.get(sourceId)!.connector;
    if (sourceId.startsWith("demo:")) {
      const c = demoById(sourceId.slice("demo:".length));
      if (c) return c;
    }
  }
  return fallbackConnector();
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
