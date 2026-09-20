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
    const schema = await getConnector(sourceId).schema();
    const { spec, attempts } = await planDashboard(question, schema, getLLM());
    return NextResponse.json({ spec, attempts });
  } catch (e) {
    const msg = e instanceof PlannerFailed ? e.message : (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
