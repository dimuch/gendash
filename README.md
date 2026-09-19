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

## What's in here (Milestones 1–3)

The full loop: question → validated spec → real numbers → an interactive
dashboard in the browser, plus the accuracy harness.

| Path | What it is |
| --- | --- |
| `packages/spec` | **The contract.** Zod schema for a dashboard spec. The heart of the product. |
| `packages/ai` | The planner: prompt, LLM interface, Zod + semantic validation, retry loop. |
| `packages/connectors` | **M2.** Compiles a validated spec into read-only, parameterised SQL, and runs it. In-memory/CSV connector (offline) + read-only Postgres connector, one interface. |
| `apps/web` | **M3.** The Next.js app: `/api/ask` (question → spec), `/api/data` (widget → rows), `/api/values` (filter options), and the Recharts renderer with shared filters and click-to-filter. |
| `fixtures/` | Hardcoded dataset schema + eval cases. |
| `scripts/demo.ts` | The 60-second happy path, headless (planner only). |
| `scripts/eval.ts` | Scores the planner. Run it after every prompt change. |
| `scripts/query-demo.ts` | Full loop, headless: question → spec → compiled SQL → real result rows. |

## Run it

```bash
npm install

# offline, deterministic (no API key) — proves the pipeline
npm run demo
npm run demo "which countries drive the most revenue?"
npm run eval
npm run query      # M2: question -> spec -> compiled SQL -> real numbers

# M3: the actual dashboard in the browser
npm run dev        # open http://localhost:3000  (uses the mock LLM with no key)
# add apps/web/.env.local with ANTHROPIC_API_KEY=... to ask free-form questions

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
- **M3 Real dashboard** — DONE. `apps/web` turns a question into a multi-widget
  dashboard with shared filters and click-a-bar-to-filter, over the same
  validated spec + connectors. `npm run dev`.
- **M4 Live** — start with polling behind SSE, not logical replication.
- **M5 Product shell** — Auth.js + Stripe, as little custom code as possible.

Keep the widget catalogue at four (line / bar / kpi / table) for v0.1. Breadth
is the trap that kills side projects.
