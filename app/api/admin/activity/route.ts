import { json, requireAdminApi } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Latest operational events for the live feed (polled by the dashboard). No conversation content. */
export async function GET(req: Request) {
  const g = await requireAdminApi(req, "dashboard.view");
  if (!g.ok) return g.res;
  const { sql } = g.ctx;
  const items = await sql`
    (SELECT 'request' AS type, at, id::text AS ref, status AS label,
        coalesce(served_model, model) AS meta, latency_ms AS value, error_category AS extra
       FROM ai_requests ORDER BY at DESC LIMIT 15)
    UNION ALL
    (SELECT 'error' AS type, e.at, e.fingerprint AS ref, g.severity AS label, g.source AS meta, NULL::int AS value, g.title AS extra
       FROM error_events e JOIN error_groups g USING (fingerprint) ORDER BY e.at DESC LIMIT 10)
    UNION ALL
    (SELECT 'alert' AS type, opened_at AS at, id::text AS ref, severity AS label, status AS meta, NULL::int AS value, title AS extra
       FROM alerts ORDER BY opened_at DESC LIMIT 5)
    ORDER BY at DESC LIMIT 25`;
  return json({ items, at: new Date().toISOString() });
}
