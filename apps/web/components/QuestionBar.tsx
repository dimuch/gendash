"use client";
import { useState } from "react";

export function QuestionBar({
  onAsk,
  loading,
  placeholder = "Ask a question about the connected data…",
}: {
  onAsk: (question: string) => void;
  loading: boolean;
  placeholder?: string;
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
          placeholder={placeholder}
          aria-label="Question"
        />
        <button type="submit" disabled={loading || !q.trim()}>
          {loading ? "Building…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
