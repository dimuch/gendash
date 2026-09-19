import type { DashboardSpec } from "@gendash/spec";

/**
 * The eval harness fixtures — the part the plan omitted, and the thing that
 * turns "the demo worked once" into "I know it's 94% reliable".
 *
 * Each case is a question + the spec we expect. `mockAnswers` (derived below)
 * lets demo/eval run offline; swap in a real LLM to get a true score.
 */

export interface EvalCase {
  question: string;
  expected: DashboardSpec;
}

export const cases: EvalCase[] = [
  {
    question: "How is revenue trending over time?",
    expected: {
      title: "Revenue over time",
      widgets: [
        { type: "kpi", title: "Total revenue", query: { table: "orders", x: "id", y: "total", agg: "sum", filters: [], limit: 1000 } },
        { type: "line", title: "Revenue by day", query: { table: "orders", x: "created_at", y: "total", agg: "sum", filters: [], limit: 1000 } },
        { type: "bar", title: "Revenue by country", query: { table: "orders", x: "country", y: "total", agg: "sum", filters: [], limit: 1000 } },
      ],
      sharedFilters: ["country", "status"],
    },
  },
  {
    question: "Which countries drive the most revenue?",
    expected: {
      title: "Revenue by country",
      widgets: [
        { type: "bar", title: "Revenue by country", query: { table: "orders", x: "country", y: "total", agg: "sum", filters: [], limit: 1000 } },
        { type: "table", title: "Orders by country", query: { table: "orders", x: "country", y: "id", agg: "count", filters: [], limit: 1000 } },
      ],
      sharedFilters: ["status"],
    },
  },
  {
    question: "How many orders do we have and how are they split by status?",
    expected: {
      title: "Order volume and status",
      widgets: [
        { type: "kpi", title: "Total orders", query: { table: "orders", x: "id", y: "id", agg: "count", filters: [], limit: 1000 } },
        { type: "bar", title: "Orders by status", query: { table: "orders", x: "status", y: "id", agg: "count", filters: [], limit: 1000 } },
      ],
      sharedFilters: ["country"],
    },
  },
];

/** question -> canned spec, for the MockLLM. */
export const mockAnswers: Record<string, unknown> = Object.fromEntries(
  cases.map((c) => [c.question, c.expected])
);
