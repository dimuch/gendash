import type { DataSourceSchema } from "@gendash/ai";

/**
 * A hardcoded dataset for M1 — no real DB yet.
 * The AI is shown ONLY `sampleSchema` (names + types). `sampleRows` exist so a
 * later milestone's renderer/query layer has something to draw.
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

export const sampleRows = {
  orders: [
    { id: 1, created_at: "2026-06-01", customer_id: 1, status: "paid", country: "BE", total: 120 },
    { id: 2, created_at: "2026-06-03", customer_id: 2, status: "paid", country: "NL", total: 80 },
    { id: 3, created_at: "2026-06-07", customer_id: 1, status: "refunded", country: "BE", total: 40 },
    { id: 4, created_at: "2026-07-02", customer_id: 3, status: "paid", country: "FR", total: 200 },
    { id: 5, created_at: "2026-07-09", customer_id: 2, status: "paid", country: "NL", total: 60 },
  ],
  customers: [
    { id: 1, name: "Acme", plan: "team", signup_date: "2026-01-10", country: "BE" },
    { id: 2, name: "Globex", plan: "solo", signup_date: "2026-02-15", country: "NL" },
    { id: 3, name: "Initech", plan: "team", signup_date: "2026-03-20", country: "FR" },
  ],
} as const;
