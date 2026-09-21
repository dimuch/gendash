import type { DataSourceSchema } from "./dataschema";

/**
 * Does this schema have a column that can serve as a time axis? A "trend over
 * time" needs one. That's either a real `date` column, or a column whose name is
 * clearly temporal (e.g. `year`, `month`, `period`) — the World Bank economy
 * dataset, for instance, carries `year` as a number but it IS a valid time axis.
 */
const TIME_NAME = /^(year|years|date|month|months|quarter|quarters|day|days|week|weeks|time|timestamp|datetime|period|periods)$/i;
const TIME_SUBSTR = /(date|year|timestamp|_at$|_ts$)/i;

export function hasTimeAxis(schema: DataSourceSchema): boolean {
  return schema.some((t) =>
    t.columns.some((c) => c.type === "date" || TIME_NAME.test(c.name) || TIME_SUBSTR.test(c.name))
  );
}

/**
 * Is the user asking for something that only makes sense over time — a trend,
 * a history, an evolution? Deliberately conservative: it should fire on clear
 * time-series intent, not on any mention of a date.
 */
const TREND_RE =
  /\b(trend|trends|trending|over[\s-]?time|through[\s-]?time|over the (years?|months?|weeks?|quarters?|decades?)|time[\s-]?series|timeline|historical|history|year[\s-]?over[\s-]?year|month[\s-]?over[\s-]?month|evolution|evolv(e|ed|ing)|trajectory|changed? over|grow(n|th|ing)? over)\b/i;

export function isTrendQuestion(question: string): boolean {
  return TREND_RE.test(question);
}
