"use client";
import { use, useEffect, useState } from "react";
import type { DashboardSpec, Query } from "@gendash/spec";
import { GenDashboard, type RunMode, type Row } from "@gendash/react";

/** Read-only shared view of a saved dashboard. */
export default function SharedDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [spec, setSpec] = useState<DashboardSpec | null>(null);
  const [question, setQuestion] = useState("");
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/dashboards/${id}`);
      if (!res.ok) return setState("missing");
      const rec = await res.json();
      // if the dashboard was built on uploaded data, re-register that data
      if (rec.data?.csv) {
        const up = await fetch("/api/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: rec.data.table, csv: rec.data.csv }),
        });
        if (up.ok) setSourceId((await up.json()).sourceId);
      }
      setSpec(rec.spec);
      setQuestion(rec.question ?? "");
      setState("ready");
    })();
  }, [id]);

  const fetchData = async (query: Query, mode: RunMode): Promise<Row[]> => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, mode, sourceId }),
    });
    const json = await res.json();
    return res.ok ? json.rows : [];
  };
  const fetchValues = async (table: string, column: string) => {
    const q = new URLSearchParams({ table, column });
    if (sourceId) q.set("sourceId", sourceId);
    const res = await fetch(`/api/values?${q.toString()}`);
    const json = await res.json();
    return res.ok ? json.values : [];
  };

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">GenDash</div>
        {question && <div className="tagline">“{question}”</div>}
      </header>
      {state === "loading" && <div className="src-info">Loading…</div>}
      {state === "missing" && <div className="error">That dashboard doesn’t exist or has expired.</div>}
      {state === "ready" && spec && (
        <GenDashboard spec={spec} fetchData={fetchData} fetchValues={fetchValues} />
      )}
      <footer className="foot">
        Made with GenDash — <a href="/">build your own from a question</a>.
      </footer>
    </main>
  );
}
