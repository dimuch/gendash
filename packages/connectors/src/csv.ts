import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import type { ColumnType, DataSourceSchema } from "@gendash/ai";
import type { Row, Cell } from "./types.js";
import { MemoryConnector } from "./memory.js";

/**
 * Minimal CSV loader — enough for the upload path in v0.1. Handles quoted
 * fields and escaped quotes; not a full RFC-4180 parser. Infers a column type
 * so the planner sees numbers as numbers.
 */
export function connectorFromCsv(path: string, tableName?: string): MemoryConnector {
  const text = readFileSync(path, "utf8");
  const table = tableName ?? basename(path, extname(path)).replace(/[^A-Za-z0-9_]/g, "_");
  const records = parseCsv(text);
  if (records.length === 0) throw new Error(`empty CSV: ${path}`);

  const header = records[0];
  const dataRows = records.slice(1);
  const types: ColumnType[] = header.map((_, c) => inferType(dataRows.map((r) => r[c])));

  const rows: Row[] = dataRows.map((r) => {
    const row: Row = {};
    header.forEach((col, c) => (row[col] = coerce(r[c], types[c])));
    return row;
  });

  const schema: DataSourceSchema = [
    { name: table, columns: header.map((name, c) => ({ name, type: types[c] })) },
  ];
  return new MemoryConnector(schema, { [table]: rows });
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;

function inferType(values: (string | undefined)[]): ColumnType {
  const present = values.filter((v) => v != null && v.trim() !== "");
  if (present.length === 0) return "string";
  if (present.every((v) => v === "true" || v === "false")) return "boolean";
  if (present.every((v) => !Number.isNaN(Number(v)))) return "number";
  if (present.every((v) => ISO_DATE.test(v!))) return "date";
  return "string";
}

function coerce(v: string | undefined, type: ColumnType): Cell {
  if (v == null || v === "") return null;
  if (type === "number") return Number(v);
  if (type === "boolean") return v === "true";
  return v;
}
