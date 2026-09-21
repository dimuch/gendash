import type { Query } from "@gendash/spec";
import type { ColumnType, DataSourceSchema } from "@gendash/ai";
import type { Connector, Row, RunOptions } from "./types";

/**
 * Read-only connector for a DISQOVER instance (ONTOFORCE), talking to its
 * `data_query` REST API at `<baseUrl>/api/query/v1.1`.
 *
 * Maps GenDash's little query model onto Disqover's faceted search:
 *   - concept type  <-> "table"        (canonical_type)
 *   - facet field   <-> "column"       (a facetable property)
 *   - groupBy+count <-> POST /facets    (candidate_facet_values -> {label,count})
 *   - rows          <-> POST /instances
 *
 * Ground truth used:
 *   POST /facets {facets:["type"]}  ->
 *     {facets:[{candidate_facet_values:[{count,label,query_value}], key,label,count}]}
 *
 * Auth: the API is JWT-protected. Pass a bearer token (from your logged-in
 * session) and/or a cookie via options — never hardcode it.
 *
 * v0.1 scope: the concept-overview table and facet-based group/count queries are
 * solid (exact response shape). Per-concept field discovery (schema) and the
 * `jf` filter format are best-effort and may need one tuning pass against your
 * instance — every request/response goes through the small helpers below so
 * that's a localized change.
 */
export interface DisqoverOptions {
  /** e.g. https://disqover-dq7.aws-dev.disqover.com */
  baseUrl: string;
  /** JWT access token -> sent as `Authorization: Bearer <token>` */
  token?: string;
  /** raw Cookie header, if the instance authenticates by session cookie */
  cookie?: string;
  /** configuration schema version the instance serves (default 4.2) */
  version?: string;
}

interface FacetValue { count: number; label: string; query_value: string }
interface FacetResult {
  facets: { candidate_facet_values: FacetValue[]; key: string; label: string; count: number }[];
}

const OVERVIEW_TABLE = "concepts"; // virtual table: one row per Disqover concept type

export class DisqoverConnector implements Connector {
  private base: string;
  /** concept slug -> canonical-type URI (filled by schema()) */
  private conceptUri = new Map<string, string>();
  /** concept slug -> (field slug -> facet URI) */
  private fieldUri = new Map<string, Map<string, string>>();

  constructor(private opts: DisqoverOptions) {
    this.base = opts.baseUrl.replace(/\/+$/, "") + "/api/query/v1.1";
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (this.opts.token) h["Authorization"] = `Bearer ${this.opts.token}`;
    if (this.opts.cookie) h["Cookie"] = this.opts.cookie;
    return h;
  }

  private async post(path: string, body: unknown): Promise<any> {
    const res = await fetch(this.base + path, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Disqover POST ${path} -> ${res.status} ${await res.text().catch(() => "")}`.slice(0, 400));
    return res.json();
  }

  private async get(path: string): Promise<any> {
    const res = await fetch(this.base + path, { headers: this.headers() });
    if (!res.ok) throw new Error(`Disqover GET ${path} -> ${res.status}`);
    return res.json();
  }

  /** The concept type counts — the Knowledge Graph overview (exact shape known). */
  private async typeCounts(): Promise<FacetValue[]> {
    const r: FacetResult = await this.post("/facets", { facets: ["type"] });
    return r.facets?.[0]?.candidate_facet_values ?? [];
  }

  async schema(): Promise<DataSourceSchema> {
    const concepts = await this.typeCounts();

    // Always expose the overview table so a live "records per data type"
    // dashboard works immediately.
    const tables: DataSourceSchema = [
      { name: OVERVIEW_TABLE, columns: [
        { name: "concept", type: "string" },
        { name: "records", type: "number" },
      ] },
    ];

    // Per-concept facetable fields, from /configuration. Defensive parsing:
    // configuration.facets is keyed by canonical-type URI with a list of
    // facet field descriptors ({uri,label,...} or typed values).
    let config: any = null;
    try {
      config = await this.get(`/configuration?version=${this.opts.version ?? "4.2"}`);
    } catch {
      /* overview-only if configuration can't be read */
    }

    for (const c of concepts) {
      const uri = c.query_value.replace(/^cfv:/, "");
      const slug = slugify(c.label);
      this.conceptUri.set(slug, uri);
      const fields = extractFacetFields(config, uri);
      if (fields.length === 0) continue; // no fields discovered -> not queryable yet
      const map = new Map<string, string>();
      const columns = fields.map((f) => {
        const fslug = slugify(f.label);
        map.set(fslug, f.uri);
        return { name: fslug, type: f.type };
      });
      this.fieldUri.set(slug, map);
      tables.push({ name: slug, columns });
    }
    return tables;
  }

  async run(query: Query, opts: RunOptions): Promise<Row[]> {
    // Overview table: served straight from the type-count facet.
    if (query.table === OVERVIEW_TABLE) {
      const concepts = await this.typeCounts();
      const rows: Row[] = concepts.map((c) => ({ concept: c.label, records: c.count }));
      if (opts.mode === "scalar") {
        return [{ value: rows.reduce((a, r) => a + (r.records as number), 0) }];
      }
      // rows / grouped both just return concept -> records here
      return rows.map((r) => (opts.mode === "grouped" ? { concept: r.concept, value: r.records } : r));
    }

    const conceptUri = this.conceptUri.get(query.table);
    if (!conceptUri) throw new Error(`unknown Disqover concept: ${query.table} (call schema() first)`);
    const jf = this.buildFilter(conceptUri, query);

    // count over the whole (filtered) concept
    if (opts.mode === "scalar") {
      const r: FacetResult = await this.post("/facets", { jf, facets: ["type"] });
      const total = (r.facets?.[0]?.candidate_facet_values ?? []).reduce((a, v) => a + v.count, 0);
      return [{ value: total }];
    }

    // grouped: facet on the x field -> value/count pairs
    if (opts.mode === "grouped") {
      const facetUri = this.fieldUri.get(query.table)?.get(query.x);
      if (!facetUri) throw new Error(`field "${query.x}" is not facetable on ${query.table}`);
      const r: FacetResult = await this.post("/facets", { jf, facets: [facetUri] });
      const vals = r.facets?.[0]?.candidate_facet_values ?? [];
      return vals.slice(0, query.limit).map((v) => ({ [query.x]: v.label, value: v.count }));
    }

    // rows: instances slice with the requested fields as properties
    const props = [query.x, query.y].filter(Boolean).map((n) => this.fieldUri.get(query.table)?.get(n!)).filter(Boolean);
    const data = await this.post("/instances", { jf, properties: props, limit: query.limit });
    return normalizeInstances(data, query);
  }

  /**
   * Build Disqover's `jf` filter — the real format, confirmed against a live
   * request: a tagged `and` node containing a base `include_all` plus an
   * `equals` clause on the "type" facet, plus any user equality filters.
   *   { op:"and", tag, filters:[
   *       { op:"and", filters:[{op:"include_all"}], tag },
   *       { facet:"type", op:"equals", value:"cfv:<conceptUri>", tag },
   *       { facet:<fieldUri>, op:"equals", value:<v>, tag }, ...
   *   ]}
   */
  private buildFilter(conceptUri: string, query: Query): unknown {
    const filters: unknown[] = [
      { op: "and", filters: [{ op: "include_all" }], tag: tag() },
      { facet: "type", op: "equals", value: `cfv:${conceptUri}`, tag: tag() },
    ];
    for (const f of query.filters) {
      const uri = this.fieldUri.get(query.table)?.get(f.column);
      if (uri && f.op === "eq") filters.push({ facet: uri, op: "equals", value: f.value, tag: tag() });
    }
    return { op: "and", tag: tag(), filters };
  }
}

/** Short unique tag, matching the ids Disqover attaches to filter nodes. */
function tag(): string {
  return Math.random().toString(36).slice(2, 8);
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
}

/** Pull facet-field descriptors for a canonical type out of /configuration (defensive). */
function extractFacetFields(config: any, ctUri: string): { uri: string; label: string; type: ColumnType }[] {
  if (!config?.facets) return [];
  const byCt = config.facets[ctUri] ?? config.facets[ctUri + "/"] ?? [];
  const list = Array.isArray(byCt) ? byCt : Object.values(byCt ?? {});
  const out: { uri: string; label: string; type: ColumnType }[] = [];
  for (const f of list as any[]) {
    const uri = f?.uri?.value ?? f?.uri ?? f?.id?.value ?? f?.id;
    const label = f?.label?.value ?? f?.label ?? uri;
    if (typeof uri === "string") out.push({ uri, label: String(label), type: guessType(f) });
  }
  return out;
}

function guessType(f: any): ColumnType {
  const t = String(f?.datatype ?? f?.range ?? "").toLowerCase();
  if (/int|float|double|decimal|number|numeric/.test(t)) return "number";
  if (/date|time/.test(t)) return "date";
  return "string";
}

/** Best-effort flattening of an /instances response into flat rows. */
function normalizeInstances(data: any, query: Query): Row[] {
  const items: any[] = data?.instances ?? data?.results ?? (Array.isArray(data) ? data : []);
  return items.slice(0, query.limit).map((it) => {
    const row: Row = {};
    for (const key of [query.x, query.y].filter(Boolean) as string[]) {
      const v = it?.[key] ?? it?.properties?.[key];
      row[key] = Array.isArray(v) ? v[0]?.label ?? v[0] ?? null : v?.label ?? v ?? null;
    }
    return row;
  });
}
