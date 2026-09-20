import { NextResponse } from "next/server";
import { DashboardSpec } from "@gendash/spec";
import { getSource } from "../../../lib/datasource";
import { saveDashboard } from "../../../lib/savedStore";

export const runtime = "nodejs";

/** POST { question, spec, sourceId? } -> { id, url } — save a shareable dashboard. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = DashboardSpec.safeParse(body.spec);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid spec" }, { status: 400 });
    }
    const src = getSource(body.sourceId);
    const id = await saveDashboard({
      title: parsed.data.title,
      question: typeof body.question === "string" ? body.question : "",
      spec: parsed.data,
      data: src ? { table: src.table, csv: src.csv } : undefined,
    });
    return NextResponse.json({ id, url: `/d/${id}` });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
