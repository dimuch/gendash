import { NextResponse } from "next/server";
import { registerCsv } from "../../../lib/datasource";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/** POST { name, csv } -> { sourceId, table, schema } */
export async function POST(req: Request) {
  try {
    const { name, csv } = await req.json();
    if (typeof csv !== "string" || !csv.trim()) {
      return NextResponse.json({ error: "csv text is required" }, { status: 400 });
    }
    if (csv.length > MAX_BYTES) {
      return NextResponse.json({ error: "CSV too large (max 8 MB for this demo)" }, { status: 413 });
    }
    const result = await registerCsv(typeof name === "string" && name ? name : "data", csv);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
