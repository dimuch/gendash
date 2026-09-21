"use client";

export interface DemoSourceInfo {
  id: string;
  label: string;
  area: string;
  description: string;
  examples: string[];
}

/**
 * Lets the visitor switch between the built-in open-API demo datasets (each a
 * different business area) and shows example questions for the active one, so
 * it's obvious what kinds of question — including non-trivial "top N" ones — the
 * data can answer. A click on an example runs it.
 */
export function SourcePicker({
  sources,
  value,
  uploaded,
  onPick,
  onAsk,
  disabled,
}: {
  sources: DemoSourceInfo[];
  value?: string;
  uploaded: boolean;
  onPick: (id: string) => void;
  onAsk: (question: string) => void;
  disabled: boolean;
}) {
  if (sources.length === 0) return null;
  const active = sources.find((s) => s.id === value);

  return (
    <div className="picker">
      <div className="picker-row">
        <span className="picker-label">Demo data:</span>
        {sources.map((s) => (
          <button
            key={s.id}
            className={`chip ${!uploaded && s.id === value ? "chip-on" : ""}`}
            onClick={() => onPick(s.id)}
            title={`${s.area} — ${s.description}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {active && !uploaded && (
        <div className="picker-hint">
          <span className="src-info">{active.description} Try:</span>
          {active.examples.map((q) => (
            <button
              key={q}
              className="example"
              onClick={() => onAsk(q)}
              disabled={disabled}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
