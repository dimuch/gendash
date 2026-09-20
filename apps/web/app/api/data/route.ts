import { NextResponse } from "next/server";
import { Query } from "@gendash/spec";
import { checkAgainstSchema } from "@gendash/ai";
import type { RunMode } from "@gendash/connectors";
import { getConnector } from "../../../lib/datasource";

export const runtime = "nodejs";

const MODES: RunMode[] = ["rows", "grouped", "scalar"];

/**
 * POST { query, mode } -> { rows }
 * Re-validates the query server-side (Zod + schema) so a crafted client request
 * can't reach the connector with a bad column or table.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Query.safeParse(body.query);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid query", issues: parsed.error.issues }, { status: 400 });
    }
    const mode: RunMode = MODES.includes(body.mode) ? body.mode : "grouped";

    const connector = getConnector(body.sourceId);
    const schema = await connector.schema();
    // one-widget spec so we can reuse the semantic checker
    const semantic = checkAgainstSchema(
      { title: "q", widgets: [{ type: "bar", title: "q", query: parsed.data }], sharedFilters: [] },
      schema
    );
    if (!semantic.ok) {
      return NextResponse.json({ error: "query not valid for schema", problems: semantic.problems }, { status: 400 });
    }

    const rows = await connector.run(parsed.data, { mode });
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
