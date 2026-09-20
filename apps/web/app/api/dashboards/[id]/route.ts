import { NextResponse } from "next/server";
import { getDashboard } from "../../../../lib/savedStore";

export const runtime = "nodejs";

/** GET -> the saved dashboard record (spec, question, and its data if uploaded). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await getDashboard(id);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rec);
}
