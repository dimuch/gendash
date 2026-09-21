export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * M4 (Live) — polling behind SSE, not logical replication.
 *
 * The server owns the refresh cadence and pushes a `tick` to the browser over
 * Server-Sent Events every `intervalMs`. The client re-runs the dashboard's
 * queries on each tick, so data stays live without the client hammering the API
 * on its own timer. This is the polling-based v0; the upgrade path is to diff
 * the source per tick and only push when something actually changed.
 *
 * GET /api/live?intervalMs=5000  ->  text/event-stream
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("intervalMs"));
  const intervalMs = Number.isFinite(raw) ? Math.min(60_000, Math.max(2_000, raw)) : 5_000;

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let seq = 0;
      const send = () => {
        const payload = JSON.stringify({ seq: seq++, t: Date.now() });
        controller.enqueue(encoder.encode(`event: tick\ndata: ${payload}\n\n`));
      };
      // Tell the client the cadence, then start ticking.
      controller.enqueue(encoder.encode(`event: hello\ndata: ${JSON.stringify({ intervalMs })}\n\n`));
      send();
      timer = setInterval(send, intervalMs);

      // Stop when the client disconnects.
      req.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
