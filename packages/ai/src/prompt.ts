import { WIDGET_TYPES } from "@gendash/spec";
import { DataSourceSchema } from "./dataschema.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function renderSchema(schema: DataSourceSchema): string {
  return schema
    .map(
      (t) =>
        `- ${t.name}(${t.columns.map((c) => `${c.name}: ${c.type}`).join(", ")})`
    )
    .join("\n");
}

const SYSTEM = `You turn a plain-language question into a JSON dashboard spec.

You MUST reply with a single JSON object and nothing else — no prose, no markdown fences.

The JSON shape:
{
  "title": string,
  "widgets": [ { "type": <widget>, "title": string, "query": <query> } ],  // 1..6 widgets
  "sharedFilters": [ string ]   // column names filterable across all widgets
}

widget types (choose ONLY from this closed set): ${WIDGET_TYPES.join(", ")}
- "kpi" is a single headline number and MUST use an aggregation.
- "line" is for trends over a date/ordered x.
- "bar" is for comparing categories.
- "table" lists rows.

query shape:
{
  "table": string,                       // must be one of the given tables
  "x": string,                           // dimension column (must exist)
  "y": string,                           // measure column, required when agg != "none"
  "agg": "count"|"sum"|"avg"|"min"|"max"|"none",
  "groupBy": string,                     // optional
  "filters": [ { "column": string, "op": "eq"|"neq"|"gt"|"lt"|"gte"|"lte"|"in", "value": ... } ],
  "limit": number                        // optional, default 1000
}

Rules:
- Use ONLY table and column names from the schema below. Never invent names.
- sum/avg/min/max require a numeric y column.
- Build a real dashboard: 2-4 widgets that answer the question from different angles, plus useful sharedFilters. Do not return a single chart unless the question truly asks for one number.`;

export function buildPrompt(
  question: string,
  schema: DataSourceSchema
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Data source schema:\n${renderSchema(schema)}\n\nQuestion: ${question}\n\nReturn the JSON dashboard spec.`,
    },
  ];
}

/** Feed a validation failure back so the model can self-correct. */
export function errorTurn(problems: string[] | string): ChatMessage {
  const list = Array.isArray(problems) ? problems.join("\n- ") : problems;
  return {
    role: "user",
    content: `That spec was invalid. Fix these problems and return corrected JSON only:\n- ${list}`,
  };
}
