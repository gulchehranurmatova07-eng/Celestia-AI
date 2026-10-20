import { requireAdminApi } from "@/lib/server/auth";
import { parseRange, requestPage } from "@/lib/server/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csv = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Quote, and neutralize spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const g = await requireAdminApi(req, "export.data");
  if (!g.ok) return g.res;
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const range = parseRange(params);
  const { rows, total } = await requestPage(g.ctx.sql, range, {
    status: params.status,
    model: params.model,
    q: params.q,
    page: 1,
    pageSize: 10_000,
  });
  await g.ctx.audit("data.exported", "ai_requests", { range: range.label, rows: rows.length, total });
  const header = ["request_id", "timestamp_utc", "model", "served_model", "status", "error_category", "latency_ms", "ttft_ms",
    "input_tokens", "output_tokens", "estimated_cost_usd", "fallback", "language", "turns"];
  const lines = rows.map((r) =>
    [r.id, r.at, r.model, r.served_model, r.status, r.error_category, r.latency_ms, r.ttft_ms, r.input_tokens,
      r.output_tokens, r.cost_usd, r.fallback, r.lang, r.turn_count].map(csv).join(","),
  );
  return new Response([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="celestia-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
