/**
 * M2 end to end, offline:
 *   question -> planner -> validated spec -> compiled SQL + real result rows.
 *
 *   npm run query
 *   npm run query "which countries drive the most revenue?"
 *   LLM_PROVIDER=anthropic npm run query "..."   # real model
 *
 * Uses the in-memory connector over the hardcoded dataset, so it shows REAL
 * aggregated numbers with no database. The compiled Postgres SQL is printed too,
 * to show exactly what would run against a real DB — parameterised, read-only.
 */
import { planDashboard, MockLLM, makeLLM, type LLMClient } from "@gendash/ai";
import { MemoryConnector, compileSql, modeForWidget } from "@gendash/connectors";
import { sampleSchema, sampleRows } from "../fixtures/schema";
import { mockAnswers } from "../fixtures/cases";

const question =
  process.argv.slice(2).join(" ").trim() || "How is revenue trending over time?";
const useReal = (process.env.LLM_PROVIDER ?? "").toLowerCase() === "anthropic";
const llm: LLMClient = useReal ? makeLLM() : new MockLLM(mockAnswers);

const connector = new MemoryConnector(sampleSchema, {
  orders: sampleRows.orders as any,
  customers: sampleRows.customers as any,
});

console.log(`\n  question: ${question}\n  provider: ${useReal ? "anthropic" : "mock"}\n`);

const { spec } = await planDashboard(question, sampleSchema, llm);
console.log(`  ── ${spec.title} ──\n`);

for (const w of spec.widgets) {
  const mode = modeForWidget(w.type, w.query.agg);
  const { text, params } = compileSql(w.query, mode);
  const rows = await connector.run(w.query, { mode });
  console.log(`  ▸ ${w.title}  [${w.type}]`);
  console.log(`    SQL:  ${text}`);
  if (params.length) console.log(`    args: ${JSON.stringify(params)}`);
  console.log(`    ->    ${JSON.stringify(rows)}\n`);
}

// ---- correctness self-check against known fixture totals ----
const totalRevenue = sampleRows.orders.reduce((a, o) => a + o.total, 0); // 500
const kpi = await connector.run(
  { table: "orders", x: "id", y: "total", agg: "sum", filters: [], limit: 1000 },
  { mode: "scalar" }
);
const byCountry = await connector.run(
  { table: "orders", x: "country", y: "total", agg: "sum", filters: [], limit: 1000 },
  { mode: "grouped" }
);
const ok =
  kpi[0].value === totalRevenue &&
  JSON.stringify(byCountry) ===
    JSON.stringify([
      { country: "BE", value: 160 },
      { country: "FR", value: 200 },
      { country: "NL", value: 140 },
    ]);
console.log(`  self-check: total=${kpi[0].value} (expect ${totalRevenue}), by-country ${ok ? "OK ✓" : "MISMATCH ✗"}`);
process.exit(ok ? 0 : 1);
