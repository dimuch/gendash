import type { ChatMessage } from "./prompt.js";

/** One provider behind one interface — swap Anthropic/OpenAI/mock freely. */
export interface LLMClient {
  /** Send messages, return the model's reply parsed as JSON. */
  json(messages: ChatMessage[]): Promise<unknown>;
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end >= 0 ? body.slice(start, end + 1) : body;
}

/** Real provider. Requires @anthropic-ai/sdk + ANTHROPIC_API_KEY. */
export class AnthropicLLM implements LLMClient {
  private model: string;
  private apiKey: string;
  constructor(opts?: { model?: string; apiKey?: string }) {
    this.model = opts?.model ?? process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
    this.apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  }

  async json(messages: ChatMessage[]): Promise<unknown> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: this.apiKey });
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const res = await client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system,
      messages: turns,
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    return JSON.parse(stripFences(text));
  }
}

/**
 * Deterministic mock so demo + eval run with no API key.
 * Maps a question -> a canned spec object. Unknown questions throw.
 */
export class MockLLM implements LLMClient {
  constructor(private byQuestion: Record<string, unknown>) {}

  async json(messages: ChatMessage[]): Promise<unknown> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const q = lastUser?.content.match(/Question:\s*(.+)/)?.[1]?.trim();
    if (q && q in this.byQuestion) return structuredClone(this.byQuestion[q]);
    throw new Error(`MockLLM has no canned answer for: ${q ?? "(no question found)"}`);
  }
}

export function makeLLM(): LLMClient {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  if (provider === "anthropic") return new AnthropicLLM();
  throw new Error(`makeLLM: unknown or non-real provider "${provider}". Use MockLLM directly for offline runs.`);
}
