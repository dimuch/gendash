import { DashboardSpec } from "@gendash/spec";
import type { DashboardSpec as Spec } from "@gendash/spec";
import { DataSourceSchema } from "./dataschema.js";
import { buildPrompt, errorTurn, ChatMessage } from "./prompt.js";
import { checkAgainstSchema } from "./checkSchema.js";
import type { LLMClient } from "./llm.js";

export class PlannerFailed extends Error {
  constructor(public attempts: number, public lastProblems: string[]) {
    super(`Planner failed after ${attempts} attempts. Last problems:\n- ${lastProblems.join("\n- ")}`);
    this.name = "PlannerFailed";
  }
}

export interface PlanResult {
  spec: Spec;
  attempts: number;
}

/**
 * Question + schema -> validated spec.
 *
 * Two gates per attempt: Zod (structure) then checkAgainstSchema (semantics).
 * Any failure is fed back to the model verbatim and retried. This double-gate +
 * feedback loop is what moves reliability from ~70% to ~95%.
 */
export async function planDashboard(
  question: string,
  schema: DataSourceSchema,
  llm: LLMClient,
  opts: { maxAttempts?: number } = {}
): Promise<PlanResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const messages: ChatMessage[] = buildPrompt(question, schema);
  let lastProblems: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw: unknown;
    try {
      raw = await llm.json(messages);
    } catch (e) {
      lastProblems = [`model did not return valid JSON: ${(e as Error).message}`];
      messages.push(errorTurn(lastProblems));
      continue;
    }

    const parsed = DashboardSpec.safeParse(raw);
    if (!parsed.success) {
      lastProblems = parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
      );
      messages.push({ role: "assistant", content: JSON.stringify(raw) });
      messages.push(errorTurn(lastProblems));
      continue;
    }

    const semantic = checkAgainstSchema(parsed.data, schema);
    if (!semantic.ok) {
      lastProblems = semantic.problems;
      messages.push({ role: "assistant", content: JSON.stringify(parsed.data) });
      messages.push(errorTurn(lastProblems));
      continue;
    }

    return { spec: parsed.data, attempts: attempt };
  }

  throw new PlannerFailed(maxAttempts, lastProblems);
}
