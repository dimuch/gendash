import { AnthropicLLM, type LLMClient } from "@gendash/ai";

/**
 * Real model when ANTHROPIC_API_KEY is set. Without a key we can't answer
 * free-form questions, so we decline gracefully through the out-of-scope path
 * (the UI shows it as a friendly notice) instead of erroring.
 */
export function getLLM(): LLMClient {
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicLLM();
  return {
    async json() {
      return {
        cannotAnswer: true,
        reason:
          "This demo needs an AI key to answer questions. Add ANTHROPIC_API_KEY to enable free-form questions.",
      };
    },
  };
}
