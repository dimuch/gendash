import { NextResponse } from "next/server";
import { planDashboard, PlannerFailed } from "@gendash/ai";
import { getConnector } from "../../../lib/datasource";
import { getLLM } from "../../../lib/llm";

export const runtime = "nodejs";

/** POST { question } -> { spec } */
export async function POST(req: Request) {
  try {
    const { question, sourceId } = await req.json();
    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    // Optional visitor-supplied key. Taken from a header (kept out of logs and
    // query strings), used only for this request, never persisted.
    const userKey = req.headers.get("x-anthropic-key") ?? undefined;
    const schema = await getConnector(sourceId).schema();
    const { spec, cannotAnswer, attempts } = await planDashboard(question, schema, getLLM(userKey));
    if (cannotAnswer) {
      return NextResponse.json({ cannotAnswer, attempts });
    }
    return NextResponse.json({ spec, attempts });
  } catch (e) {
    const msg = e instanceof PlannerFailed ? e.message : (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
