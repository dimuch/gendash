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

/** Canned specs so the app runs with no API key (mirrors the repo eval cases). */
export const mockAnswers: Record<string, unknown> = {
  "How is revenue trending over time?": {
    title: "Revenue over time",
    widgets: [
      { type: "kpi", title: "Total revenue", query: { table: "orders", x: "id", y: "total", agg: "sum", filters: [], limit: 1000 } },
      { type: "line", title: "Revenue by day", query: { table: "orders", x: "created_at", y: "total", agg: "sum", filters: [], limit: 1000 } },
      { type: "bar", title: "Revenue by country", query: { table: "orders", x: "country", y: "total", agg: "sum", filters: [], limit: 1000 } },
    ],
    sharedFilters: ["country", "status"],
  },
  "Which countries drive the most revenue?": {
    title: "Revenue by country",
    widgets: [
      { type: "bar", title: "Revenue by country", query: { table: "orders", x: "country", y: "total", agg: "sum", filters: [], limit: 1000 } },
      { type: "table", title: "Orders by country", query: { table: "orders", x: "country", y: "id", agg: "count", filters: [], limit: 1000 } },
    ],
    sharedFilters: ["status"],
  },
  "How many orders do we have and how are they split by status?": {
    title: "Order volume and status",
    widgets: [
      { type: "kpi", title: "Total orders", query: { table: "orders", x: "id", y: "id", agg: "count", filters: [], limit: 1000 } },
      { type: "bar", title: "Orders by status", query: { table: "orders", x: "status", y: "id", agg: "count", filters: [], limit: 1000 } },
    ],
    sharedFilters: ["country"],
  },
};

export const EXAMPLE_QUESTIONS = Object.keys(mockAnswers);
