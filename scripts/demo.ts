/**
 * The 60-second happy path, headless.
 *
 *   npm run demo                       # uses the MockLLM (no API key)
 *   LLM_PROVIDER=anthropic npm run demo "your question here"   # real model
 *
 * Prints the validated dashboard spec for a question against the hardcoded
 * dataset. This is the make-or-break loop: question -> AI -> validated spec.
 */
import { planDashboard, MockLLM, makeLLM, type LLMClient } from "@gendash/ai";
import { sampleSchema } from "../fixtures/schema.js";
import { mockAnswers } from "../fixtures/cases.js";

const question =
  process.argv.slice(2).join(" ").trim() || "How is revenue trending over time?";

const useReal = (process.env.LLM_PROVIDER ?? "").toLowerCase() === "anthropic";
const llm: LLMClient = useReal ? makeLLM() : new MockLLM(mockAnswers);

console.log(`\n  question:  ${question}`);
console.log(`  provider:  ${useReal ? "anthropic" : "mock"}\n`);

try {
  const { spec, attempts } = await planDashboard(question, sampleSchema, llm);
  console.log(`  ✓ valid spec in ${attempts} attempt(s)\n`);
  console.log(JSON.stringify(spec, null, 2));
} catch (e) {
  console.error(`  ✗ ${(e as Error).message}`);
  process.exit(1);
}
