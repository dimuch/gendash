import type { DataSourceSchema } from "@gendash/ai";
import type { Row } from "@gendash/connectors";

/**
 * The demo data source for the app (same shape as the repo fixtures).
 * Swap getConnector() for a PostgresConnector to point at a real database.
 */
export const sampleSchema: DataSourceSchema = [
  {
    name: "orders",
    columns: [
      { name: "id", type: "number" },
      { name: "created_at", type: "date" },
      { name: "customer_id", type: "number" },
      { name: "status", type: "string" },
      { name: "country", type: "string" },
      { name: "total", type: "number" },
    ],
  },
  {
    name: "customers",
    columns: [
      { name: "id", type: "number" },
      { name: "name", type: "string" },
      { name: "plan", type: "string" },
      { name: "signup_date", type: "date" },
      { name: "country", type: "string" },
    ],
  },
];

export const sampleRows: Record<string, Row[]> = {
  orders: [
    { id: 1, created_at: "2026-06-01", customer_id: 1, status: "paid", country: "BE", total: 120 },
    { id: 2, created_at: "2026-06-03", customer_id: 2, status: "paid", country: "NL", total: 80 },
    { id: 3, created_at: "2026-06-07", customer_id: 1, status: "refunded", country: "BE", total: 40 },
    { id: 4, created_at: "2026-07-02", customer_id: 3, status: "paid", country: "FR", total: 200 },
    { id: 5, created_at: "2026-07-09", customer_id: 2, status: "paid", country: "NL", total: 60 },
    { id: 6, created_at: "2026-07-15", customer_id: 3, status: "paid", country: "FR", total: 150 },
    { id: 7, created_at: "2026-08-01", customer_id: 1, status: "paid", country: "BE", total: 90 },
    { id: 8, created_at: "2026-08-05", customer_id: 2, status: "refunded", country: "NL", total: 30 },
  ],
  customers: [
    { id: 1, name: "Acme", plan: "team", signup_date: "2026-01-10", country: "BE" },
    { id: 2, name: "Globex", plan: "solo", signup_date: "2026-02-15", country: "NL" },
    { id: 3, name: "Initech", plan: "team", signup_date: "2026-03-20", country: "FR" },
  ],
};

/** Canned specs so the demo chips work with no API key (studies dataset). */
export const mockAnswers: Record<string, unknown> = {
  "How many studies are there per therapeutic area?": {
    title: "Studies by therapeutic area",
    widgets: [
      { type: "kpi", title: "Total studies", query: { table: "studies", x: "id", y: "id", agg: "count", filters: [], limit: 1000 } },
      { type: "bar", title: "Studies per therapeutic area", query: { table: "studies", x: "therapeutic_area", y: "id", agg: "count", filters: [], limit: 1000 } },
    ],
    sharedFilters: ["phase", "status"],
  },
  "Studies started per year by phase": {
    title: "Studies started per year by phase",
    widgets: [
      { type: "line", title: "Studies per year by phase", query: { table: "studies", x: "start_date", y: "id", agg: "count", bucket: "year", groupBy: "phase", filters: [], limit: 1000 } },
    ],
    sharedFilters: ["therapeutic_area", "status"],
  },
  "Average enrollment by phase": {
    title: "Average enrollment by phase",
    widgets: [
      { type: "kpi", title: "Avg enrollment (all)", query: { table: "studies", x: "id", y: "enrollment", agg: "avg", filters: [], limit: 1000 } },
      { type: "bar", title: "Average enrollment by phase", query: { table: "studies", x: "phase", y: "enrollment", agg: "avg", filters: [], limit: 1000 } },
    ],
    sharedFilters: ["therapeutic_area", "status"],
  },
  "Which sponsors run the most studies, and their status breakdown?": {
    title: "Studies by sponsor",
    widgets: [
      { type: "bar", title: "Studies per sponsor", query: { table: "studies", x: "sponsor", y: "id", agg: "count", filters: [], limit: 1000 } },
      { type: "bar", title: "Status breakdown by sponsor", query: { table: "studies", x: "sponsor", y: "id", agg: "count", groupBy: "status", filters: [], limit: 1000 } },
    ],
    sharedFilters: ["therapeutic_area", "phase"],
  },
};

// Example chips for the clinical studies data source. Need a real model / API key.
export const EXAMPLE_QUESTIONS = [
  "How many studies are there per therapeutic area?",
  "Studies started per year by phase",
  "Average enrollment by phase",
  "Which sponsors run the most studies, and their status breakdown?",
];
