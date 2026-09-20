"use client";
import { useRef, useState } from "react";

export function UploadBar({
  onUpload,
  info,
}: {
  onUpload: (name: string, csv: string) => Promise<void>;
  info: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      await onUpload(file.name.replace(/\.csv$/i, ""), text);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="upload">
      <input ref={ref} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={onChange} />
      <button className="chip" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? "Loading…" : "⬆ Connect a CSV"}
      </button>
      <span className="src-info">{info ?? "using demo data — clinical studies"}</span>
    </div>
  );
}
