"use client";
import { useState } from "react";
import { EXAMPLE_QUESTIONS } from "../lib/sampleData";

export function QuestionBar({
  onAsk,
  loading,
  showExamples = true,
}: {
  onAsk: (question: string) => void;
  loading: boolean;
  showExamples?: boolean;
}) {
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) onAsk(q.trim());
  };

  return (
    <div className="ask">
      <form onSubmit={submit} className="ask-form">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a question about your data…"
          aria-label="Question"
        />
        <button type="submit" disabled={loading || !q.trim()}>
          {loading ? "Building…" : "Ask"}
        </button>
      </form>
      <div className="examples" style={{ display: showExamples ? undefined : "none" }}>
        {EXAMPLE_QUESTIONS.map((ex) => (
          <button key={ex} className="chip" onClick={() => { setQ(ex); onAsk(ex); }} disabled={loading}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
