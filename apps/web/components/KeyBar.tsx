"use client";
import { useState } from "react";

/**
 * Lets a visitor paste their own Anthropic API key so the demo works even when
 * the server has none. The key lives only in this browser tab (sessionStorage +
 * component state) and is sent as a request header for the visitor's own
 * questions — it is never stored on the server.
 */
export function KeyBar({
  value,
  onChange,
  hasServerKey,
}: {
  value: string;
  onChange: (key: string) => void;
  hasServerKey: boolean;
}) {
  const [open, setOpen] = useState(!hasServerKey && !value);
  const set = value.trim().length > 0;

  if (!open) {
    return (
      <div className="keybar">
        <button className="chip" onClick={() => setOpen(true)}>
          {set ? "🔑 Your API key (set)" : hasServerKey ? "🔑 Use your own API key" : "🔑 Add an API key"}
        </button>
      </div>
    );
  }

  return (
    <div className="keybar keybar-open">
      <input
        type="password"
        value={value}
        placeholder="sk-ant-…  (your Anthropic API key)"
        aria-label="Anthropic API key"
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {set && (
        <button className="chip" onClick={() => onChange("")}>Clear</button>
      )}
      <button className="chip" onClick={() => setOpen(false)}>Done</button>
      <span className="src-info">
        Stays in this browser tab; used only for your questions.{" "}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Get a key</a>
      </span>
    </div>
  );
}
