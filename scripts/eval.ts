/**
 * The accuracy harness. Run it after every prompt change.
 *
 *   npm run eval                         # scores the planner via MockLLM
 *   LLM_PROVIDER=anthropic npm run eval  # real signal against the model
 *
 * Scoring is structural, not exact-JSON: does the plan use the right widget
 * types and the right column/agg per widget? Titles and ordering don't count.
 */
import { planDashboard, MockLLM, makeLLM, type LLMClient } from "@gendash/ai";
import type { DashboardSpec, Widget } from "@gendash/spec";
import { sampleSchema } from "../fixtures/schema";
import { cases, mockAnswers } from "../fixtures/cases";

function widgetKey(w: Widget): string {
  const q = w.query;
  return [w.type, q.table, q.x, q.y ?? "-", q.agg].join("|");
}

/** 0..1 overlap of {type, table, x, y, agg} widget signatures. */
function scoreSpec(expected: DashboardSpec, actual: DashboardSpec): number {
  const want = expected.widgets.map(widgetKey);
  const got = new Set(actual.widgets.map(widgetKey));
  const hits = want.filter((k) => got.has(k)).length;
  return want.length === 0 ? 1 : hits / want.length;
}

const useReal = (process.env.LLM_PROVIDER ?? "").toLowerCase() === "anthropic";
const llm: LLMClient = useReal ? makeLLM() : new MockLLM(mockAnswers);

console.log(`\n  GenDash planner eval — provider: ${useReal ? "anthropic" : "mock"}\n`);

let total = 0;
let failures = 0;

for (const c of cases) {
  try {
    const { spec, attempts } = await planDashboard(c.question, sampleSchema, llm);
    const score = scoreSpec(c.expected, spec);
    total += score;
    const mark = score === 1 ? "✓" : score >= 0.5 ? "~" : "✗";
    if (score < 1) failures++;
    console.log(`  ${mark} ${score.toFixed(2)}  (${attempts} try)  ${c.question}`);
  } catch (e) {
    failures++;
    console.log(`  ✗ 0.00  FAILED       ${c.question}\n      ${(e as Error).message.split("\n")[0]}`);
  }
}

const avg = total / cases.length;
console.log(`\n  score: ${(avg * 100).toFixed(1)}%   (${cases.length - failures}/${cases.length} perfect)\n`);
process.exit(avg >= 0.8 ? 0 : 1);
