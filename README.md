# GenDash

**Ask a question, get a live dashboard — no SQL, no setup.**

A non-technical user connects one data source, types a question in plain
language, and gets back a live, interactive dashboard — not a paragraph and not
a single static chart.

## The spine

Everything hinges on one loop. The AI never writes code or SQL you run blindly —
it emits a JSON **dashboard spec** that must pass a Zod schema *and* a check
against the real data-source schema. Your code, not the AI, turns the validated
spec into read-only parameterised queries.

```
question ─┐
          ▼
   AI planner ──► spec JSON ──► Zod valid? ──no─┐ (retry with the error)
          ▲                        │ yes        │
   data schema                     ▼            │
                        columns real? ──no──────┘
                                   │ yes
                                   ▼
                         query builder (your code)
                                   ▼
                            renderer ► dashboard
```

## What's in here (Milestones 1–2)

The make-or-break part — question → validated spec → real numbers — running
against a hardcoded dataset (or a CSV), plus the accuracy harness.

| Path | What it is |
| --- | --- |
| `packages/spec` | **The contract.** Zod schema for a dashboard spec. The heart of the product. |
| `packages/ai` | The planner: prompt, LLM interface, Zod + semantic validation, retry loop. |
| `packages/connectors` | **M2.** Compiles a validated spec into read-only, parameterised SQL, and runs it. In-memory/CSV connector (offline) + read-only Postgres connector, one interface. |
| `fixtures/` | Hardcoded dataset schema + eval cases. |
| `scripts/demo.ts` | The 60-second happy path, headless (planner only). |
| `scripts/eval.ts` | Scores the planner. Run it after every prompt change. |
| `scripts/query-demo.ts` | Full loop: question → spec → compiled SQL → real result rows. |

## Run it

```bash
npm install

# offline, deterministic (no API key) — proves the pipeline
npm run demo
npm run demo "which countries drive the most revenue?"
npm run eval
npm run query      # M2: question -> spec -> compiled SQL -> real numbers

# real signal against a model
cp .env.example .env   # add ANTHROPIC_API_KEY
LLM_PROVIDER=anthropic npm run demo "how is revenue trending?"
LLM_PROVIDER=anthropic npm run eval
```

The mock LLM returns canned specs so the pipeline runs anywhere; the real score
only means something with `LLM_PROVIDER=anthropic`.

## Next milestones

- **M2 Real data** — DONE. `packages/connectors` compiles a validated spec into
  read-only parameterised SQL and runs it (in-memory/CSV offline; Postgres for
  real DBs). To use a real Postgres, set a `SELECT`-only role and pass a
  connection string to `PostgresConnector`.
- **M3 Real dashboard** — the Next.js app + Recharts renderer (`apps/web`) that
  turns spec + result rows into linked charts with filters and cross-highlight.
- **M4 Live** — start with polling behind SSE, not logical replication.
- **M5 Product shell** — Auth.js + Stripe, as little custom code as possible.

Keep the widget catalogue at four (line / bar / kpi / table) for v0.1. Breadth
is the trap that kills side projects.
