"use client";
import { useCallback, useState } from "react";
import type { DashboardSpec, Query } from "@gendash/spec";
import { GenDashboard, type RunMode, type Row } from "@gendash/react";
import { QuestionBar } from "./QuestionBar";
import { UploadBar } from "./UploadBar";

/**
 * App chrome around the reusable <GenDashboard>. Owns the question box, the
 * CSV-upload control, and the planner call; hands the library a spec plus
 * data-fetching functions bound to the currently selected data source.
 */
export function Dashboard() {
  const [spec, setSpec] = useState<DashboardSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [info, setInfo] = useState<string | null>(null);

  const upload = useCallback(async (name: string, csv: string) => {
    setError(null);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, csv }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "upload failed");
      return;
    }
    setSourceId(json.sourceId);
    setSpec(null);
    const cols = json.schema?.[0]?.columns?.length ?? 0;
    setInfo(`connected: ${json.table} — ${cols} columns`);
  }, []);

  const ask = useCallback(async (question: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, sourceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "planner failed");
      setSpec(json.spec as DashboardSpec);
    } catch (e) {
      setSpec(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  const fetchData = useCallback(async (query: Query, mode: RunMode): Promise<Row[]> => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, mode, sourceId }),
    });
    const json = await res.json();
    return res.ok ? json.rows : [];
  }, [sourceId]);

  const fetchValues = useCallback(async (table: string, column: string) => {
    const q = new URLSearchParams({ table, column });
    if (sourceId) q.set("sourceId", sourceId);
    const res = await fetch(`/api/values?${q.toString()}`);
    const json = await res.json();
    return res.ok ? json.values : [];
  }, [sourceId]);

  return (
    <div>
      <UploadBar onUpload={upload} info={info} />
      <QuestionBar onAsk={ask} loading={loading} showExamples={!sourceId} />
      {error && <div className="error">{error}</div>}
      {spec && <GenDashboard spec={spec} fetchData={fetchData} fetchValues={fetchValues} />}
    </div>
  );
}
