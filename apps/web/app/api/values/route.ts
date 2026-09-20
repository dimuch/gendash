import { NextResponse } from "next/server";
import { getConnector } from "../../../lib/datasource";

export const runtime = "nodejs";

/** GET ?table=orders&column=country -> { values: [...] }  (distinct, for filters) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") ?? "";
  const column = searchParams.get("column") ?? "";
  const sourceId = searchParams.get("sourceId") ?? undefined;
  try {
    const connector = getConnector(sourceId);
    const schema = await connector.schema();
    const t = schema.find((x) => x.name === table);
    if (!t || !t.columns.some((c) => c.name === column)) {
      return NextResponse.json({ error: "unknown table/column" }, { status: 400 });
    }
    const rows = await connector.run(
      { table, x: column, agg: "none", filters: [], limit: 10000 },
      { mode: "rows" }
    );
    const values = [...new Set(rows.map((r) => r[column]))].filter((v) => v != null);
    return NextResponse.json({ values });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
