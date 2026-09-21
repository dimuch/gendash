import { AnthropicLLM, type LLMClient } from "@gendash/ai";

/**
 * Pick the model provider for one request.
 *
 * Priority: a key the visitor typed into the UI (passed here per-request,
 * never stored on the server) wins, then the deployer's ANTHROPIC_API_KEY.
 * With no key at all we decline gracefully through the out-of-scope path
 * (the UI shows a friendly notice) instead of erroring.
 */
export function getLLM(userKey?: string): LLMClient {
  const key = userKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (key) return new AnthropicLLM({ apiKey: key });
  return {
    async json() {
      return {
        cannotAnswer: true,
        reason:
          "This demo needs an Anthropic API key to answer questions. Paste your own key above (it stays in your browser and is only used for your requests), or set ANTHROPIC_API_KEY on the server.",
      };
    },
  };
}
