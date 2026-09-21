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
  const [notice, setNotice] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [info, setInfo] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    setNotice(null);
    setSavedUrl(null);
    setLastQuestion(question);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, sourceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "planner failed");
      if (json.cannotAnswer) {
        setSpec(null);
        setNotice(json.cannotAnswer);
        return;
      }
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

  const save = useCallback(async () => {
    if (!spec) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: lastQuestion, spec, sourceId }),
      });
      const json = await res.json();
      if (res.ok) setSavedUrl(new URL(json.url, window.location.origin).toString());
    } finally {
      setSaving(false);
    }
  }, [spec, lastQuestion, sourceId]);

  return (
    <div>
      <UploadBar onUpload={upload} info={info} />
      <QuestionBar
        onAsk={ask}
        loading={loading}
        placeholder={
          sourceId
            ? "Ask a question about your uploaded data…"
            : "Ask about world countries — e.g. “total area by region”, “countries per subregion”, “landlocked countries by region”"
        }
      />

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {spec && (
        <>
          <div className="save-row">
            <button className="chip" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "🔗 Save & share"}
            </button>
            {savedUrl && (
              <span className="src-info">
                Shareable link:{" "}
                <a href={savedUrl} target="_blank" rel="noreferrer">{savedUrl}</a>
              </span>
            )}
          </div>
          <GenDashboard spec={spec} fetchData={fetchData} fetchValues={fetchValues} />
        </>
      )}
    </div>
  );
}
