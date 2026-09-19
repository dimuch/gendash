import { z } from "zod";

/**
 * The contract between the AI and the UI.
 *
 * This is the single most important file in the repo. The AI must produce a
 * value that parses against `DashboardSpec`, and the renderer consumes exactly
 * this shape. Because widgets are a closed `discriminatedUnion` and the only
 * free-form strings are table/column names (which are checked against the real
 * schema separately), the AI can never invent a component or emit raw SQL.
 */

export const Aggregation = z.enum(["count", "sum", "avg", "min", "max", "none"]);
export type Aggregation = z.infer<typeof Aggregation>;

export const FilterOp = z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "in"]);
export type FilterOp = z.infer<typeof FilterOp>;

export const Filter = z.object({
  column: z.string(),
  op: FilterOp,
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});
export type Filter = z.infer<typeof Filter>;

export const Query = z.object({
  table: z.string(),
  /** dimension / category column (x axis, group key, table column) */
  x: z.string(),
  /** measure column — required when agg is not "none" */
  y: z.string().optional(),
  agg: Aggregation.default("none"),
  groupBy: z.string().optional(),
  filters: z.array(Filter).default([]),
  limit: z.number().int().positive().max(10000).default(1000),
});
export type Query = z.infer<typeof Query>;

const WidgetBase = { title: z.string().min(1), query: Query } as const;

export const Widget = z.discriminatedUnion("type", [
  z.object({ type: z.literal("line"), ...WidgetBase }),
  z.object({ type: z.literal("bar"), ...WidgetBase }),
  z.object({ type: z.literal("kpi"), ...WidgetBase }),
  z.object({ type: z.literal("table"), ...WidgetBase }),
]);
export type Widget = z.infer<typeof Widget>;

/** The whole catalogue, as a value the prompt can enumerate. */
export const WIDGET_TYPES = ["line", "bar", "kpi", "table"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const DashboardSpec = z.object({
  title: z.string().min(1),
  widgets: z.array(Widget).min(1).max(6),
  /** column names that can be filtered across every widget at once */
  sharedFilters: z.array(z.string()).default([]),
});
export type DashboardSpec = z.infer<typeof DashboardSpec>;
