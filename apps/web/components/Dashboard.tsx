"use client";
import { useCallback, useState } from "react";
import type { DashboardSpec, Query } from "@gendash/spec";
import { GenDashboard, type RunMode, type Row } from "@gendash/react";
import { QuestionBar } from "./QuestionBar";

/**
 * App chrome around the reusable <GenDashboard> library component:
 * owns the question box and the planner call; hands the library a spec plus
 * functions that fetch data through this app's API routes.
 */
export function Dashboard() {
  const [spec, setSpec] = useState<DashboardSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (question: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
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
  }, []);

  const fetchData = useCallback(async (query: Query, mode: RunMode): Promise<Row[]> => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, mode }),
    });
    const json = await res.json();
    return res.ok ? json.rows : [];
  }, []);

  const fetchValues = useCallback(async (table: string, column: string) => {
    const res = await fetch(`/api/values?table=${encodeURIComponent(table)}&column=${encodeURIComponent(column)}`);
    const json = await res.json();
    return res.ok ? json.values : [];
  }, []);

  return (
    <div>
      <QuestionBar onAsk={ask} loading={loading} />
      {error && <div className="error">Couldn’t build that dashboard: {error}</div>}
      {spec && <GenDashboard spec={spec} fetchData={fetchData} fetchValues={fetchValues} />}
    </div>
  );
}
