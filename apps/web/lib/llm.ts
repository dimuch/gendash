import { AnthropicLLM, MockLLM, type LLMClient } from "@gendash/ai";
import { mockAnswers } from "./sampleData";

/**
 * Real model when ANTHROPIC_API_KEY is set; otherwise the deterministic mock so
 * the app runs out of the box. Set the key in apps/web/.env.local to go live.
 */
export function getLLM(): LLMClient {
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicLLM();
  return new MockLLM(mockAnswers);
}
