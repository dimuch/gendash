# GenDash

**Ask a question, get a live dashboard — no SQL, no setup.**

A non-technical user connects one data source, types a question in plain
language, and gets back a live, interactive dashboard — not a paragraph and not
a single static chart.

Try it with the built-in open-API demo datasets across five business areas
(geography, retail, HR, crypto, macro-economics), upload a CSV, or point a
connector at your own Postgres/product API. Questions can be non-trivial —
"top 10 products by rating", "5 categories with the highest average price",
"top countries by GDP in 2021" — and a **🔴 Go live** toggle keeps the
dashboard refreshing from the source.

## Why it's useful — the glue

**GenDash is not a chart library. It's a headless engine: a plain-English
question → a validated, safe dashboard *spec* + the data to fill it.** The
renderer in this repo is the disposable part — every serious product already has
chart and table components, so competing there is a losing game.

The valuable, reusable, hard-to-copy parts are the ones a charting library is
*not*:

- **the planner** — turns a question into a structured dashboard spec;
- **the validation contract** (`packages/spec`) — guarantees the model can never
  emit an unsafe or invalid query;
- **the connectors** (`packages/connectors`) — fetch the numbers from Postgres,
  CSV, or a real product API (there's a live [DISQOVER](https://www.ontoforce.com/)
  connector in here);
- **the eval harness** — makes the planner's reliability measurable, not a guess.

The spec is plain JSON, so it is **renderer-agnostic by design**. That's the
mental model:

> **You bring the brain (question → validated spec → data). The host app brings
> the pixels (its own chart/table components).**

- **Existing products** (e.g. a data platform that already has charts): keep
  their components, drop in GenDash's planner + connector + spec, and write a
  thin adapter (~tens of lines) mapping a spec widget to *their* component.
  GenDash supplies the AI + safety + data layer they don't have; they keep the
  look they already do.
- **Greenfield projects**: use the whole stack, renderer included, for a free
  head start.

One-line pitch: **a headless, testable engine that turns a question into a
validated dashboard spec and its data — plug it behind the chart components you
already have.**

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

## Demo datasets (open APIs, no key)

Switch between these in the app to explore different business areas. Each ships
example questions; all support filtering, grouping, and **top-N / superlative**
questions ("largest", "highest average", "biggest 24h gainers").

| Dataset | Area | Source | Example questions |
| --- | --- | --- | --- |
| World countries | Geography | mledoze/countries | *top 10 largest countries by area* · *total area by region* |
| Retail products | E-commerce | DummyJSON | *average price by category* · *top 10 products by rating* |
| People & orgs | HR | DummyJSON (synthetic) | *headcount by department* · *average age by city* |
| Crypto markets | Finance | CoinGecko | *top 10 coins by market cap* · *biggest 24h gainers* |
| Global economy | Macro | World Bank | *top 10 countries by gdp in 2021* · *population by region* |

Crypto has a 30s cache so **Go live** shows moving prices; the others are static
snapshots. Set `DISQOVER_URL` to use a live [DISQOVER](https://www.ontoforce.com/)
instance instead of the default demo.

## What's in here (Milestones 1–4)

The full loop: question → validated spec → real numbers → an interactive,
optionally live dashboard in the browser, plus the accuracy harness.

| Path | What it is |
| --- | --- |
| `packages/spec` | **The contract.** Zod schema for a dashboard spec. The heart of the product. |
| `packages/ai` | The planner: prompt, LLM interface, Zod + semantic validation, retry loop. |
| `packages/connectors` | **M2.** Compiles a validated spec into read-only, parameterised SQL, and runs it. In-memory/CSV connector (offline) + read-only Postgres connector, one interface. |
| `apps/web` | **M3 + M4.** The Next.js app: `/api/ask` (question → spec), `/api/data` (widget → rows), `/api/values` (filter options), `/api/live` (**M4** SSE refresh clock), plus a demo-source picker and the Recharts renderer with shared filters and click-to-filter. |
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

# M3 + M4: the actual dashboard in the browser
npm run dev        # open http://localhost:3000
# Free-form questions need an Anthropic key. Either:
#   - set ANTHROPIC_API_KEY in apps/web/.env.local (server-wide), or
#   - paste your own key in the app's "🔑 Add an API key" field — it stays in
#     your browser tab and is sent only with your own requests.

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
- **M4 Live** — DONE (v0). `/api/live` is a Server-Sent-Events stream: the
  server owns the refresh cadence and pushes a `tick` every few seconds; the
  client re-runs the dashboard's queries on each tick (**🔴 Go live** in the
  app). This is polling behind SSE, not logical replication — the upgrade path
  is to diff the source per tick and only push on real change.
- **M5 Product shell** — Auth.js + Stripe, as little custom code as possible.

Keep the widget catalogue at four (line / bar / kpi / table) for v0.1. Breadth
is the trap that kills side projects.
