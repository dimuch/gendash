"use client";
import { useCallback, useEffect, useState } from "react";
import type { DashboardSpec, Query } from "@gendash/spec";
import { GenDashboard, type RunMode, type Row } from "@gendash/react";
import { QuestionBar } from "./QuestionBar";
import { UploadBar } from "./UploadBar";
import { KeyBar } from "./KeyBar";
import { SourcePicker, type DemoSourceInfo } from "./SourcePicker";

const KEY_STORE = "gendash.anthropicKey";

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
  const [apiKey, setApiKey] = useState("");
  const [hasServerKey, setHasServerKey] = useState(true);
  const [sources, setSources] = useState<DemoSourceInfo[]>([]);
  const [live, setLive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastTick, setLastTick] = useState<number | null>(null);

  // Restore a key the visitor set earlier in this tab, and load the config:
  // whether the server has a key, and the demo dataset catalog.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORE);
      if (saved) setApiKey(saved);
    } catch {}
    fetch("/api/config")
      .then((r) => r.json())
      .then((j) => {
        setHasServerKey(Boolean(j.hasServerKey));
        const list: DemoSourceInfo[] = Array.isArray(j.sources) ? j.sources : [];
        setSources(list);
        setSourceId((cur) => cur ?? list[0]?.id);
      })
      .catch(() => {});
  }, []);

  // M4 Live: subscribe to the server's SSE clock; each tick re-runs the
  // dashboard's queries (the server owns the cadence — polling behind SSE).
  useEffect(() => {
    if (!live || !spec) return;
    // Crypto moves on a ~30s cache; poll a bit slower there, snappier elsewhere.
    const intervalMs = sourceId === "demo:crypto" ? 10000 : 5000;
    const es = new EventSource(`/api/live?intervalMs=${intervalMs}`);
    es.addEventListener("tick", () => {
      setRefreshKey((k) => k + 1);
      setLastTick(Date.now());
    });
    es.onerror = () => {}; // browser auto-reconnects
    return () => es.close();
  }, [live, spec, sourceId]);

  // Turning off live, or losing the spec, clears the indicator.
  useEffect(() => {
    if (!live || !spec) setLastTick(null);
  }, [live, spec]);

  const pickSource = useCallback((id: string) => {
    setSourceId(id);
    setSpec(null);
    setNotice(null);
    setError(null);
    setInfo(null);
    setSavedUrl(null);
  }, []);

  const uploaded = Boolean(sourceId && !sourceId.startsWith("demo:"));
  const activeSource = sources.find((s) => s.id === sourceId);

  const updateKey = useCallback((key: string) => {
    setApiKey(key);
    try {
      if (key.trim()) sessionStorage.setItem(KEY_STORE, key.trim());
      else sessionStorage.removeItem(KEY_STORE);
    } catch {}
  }, []);

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
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (apiKey.trim()) headers["x-anthropic-key"] = apiKey.trim();
      const res = await fetch("/api/ask", {
        method: "POST",
        headers,
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
  }, [sourceId, apiKey]);

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
      <SourcePicker
        sources={sources}
        value={sourceId}
        uploaded={uploaded}
        onPick={pickSource}
        onAsk={ask}
        disabled={loading}
      />
      <UploadBar onUpload={upload} info={info} />
      <KeyBar value={apiKey} onChange={updateKey} hasServerKey={hasServerKey} />
      <QuestionBar
        onAsk={ask}
        loading={loading}
        placeholder={
          uploaded
            ? "Ask a question about your uploaded data…"
            : activeSource
              ? `Ask about ${activeSource.label.toLowerCase()} — e.g. “${activeSource.examples[0]}”`
              : "Ask a question about the data…"
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
            <button
              className={`chip ${live ? "chip-live" : ""}`}
              onClick={() => setLive((v) => !v)}
              title="Auto-refresh the dashboard from the live source"
            >
              {live ? "⏸ Stop live" : "🔴 Go live"}
            </button>
            {live && (
              <span className="src-info">
                Live · {lastTick ? `updated ${new Date(lastTick).toLocaleTimeString()}` : "connecting…"}
              </span>
            )}
            {savedUrl && (
              <span className="src-info">
                Shareable link:{" "}
                <a href={savedUrl} target="_blank" rel="noreferrer">{savedUrl}</a>
              </span>
            )}
          </div>
          <GenDashboard spec={spec} fetchData={fetchData} fetchValues={fetchValues} refreshKey={refreshKey} />
        </>
      )}
    </div>
  );
}
