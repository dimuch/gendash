import { NextResponse } from "next/server";
import { demoCatalog } from "../../../lib/datasource";

export const runtime = "nodejs";

/** Public, non-secret UI hints: server-key presence + the demo dataset catalog. */
export async function GET() {
  return NextResponse.json({
    hasServerKey: Boolean(process.env.ANTHROPIC_API_KEY),
    sources: demoCatalog(),
  });
}
