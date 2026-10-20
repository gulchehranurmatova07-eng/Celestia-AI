import type { Sql } from "./db";

// Every number on the dashboard comes from one of these queries over real rows
// (ai_requests, analytics_events, error_*, health_checks). Buckets with no data
// are returned as explicit zeros, never interpolated.

export type RangeKey = "24h" | "7d" | "30d" | "custom";
export type Range = { key: RangeKey; from: Date; to: Date; unit: "hour" | "day"; label: string };

const DAY = 86_400_000;

export function parseRange(params: Record<string, string | string[] | undefined>): Range {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const now = new Date();
  const key = get("range");
  if (key === "custom") {
    const from = new Date(`${get("from")}T00:00:00Z`);
    const toDay = new Date(`${get("to")}T00:00:00Z`);
    if (!isNaN(+from) && !isNaN(+toDay) && from <= toDay) {
      const to = new Date(Math.min(+toDay + DAY, +now));
      if (+to - +from <= 180 * DAY && +from < +to) {
        return {
          key: "custom",
          from,
          to,
          unit: +to - +from <= 2 * DAY ? "hour" : "day",
          label: `${get("from")} → ${get("to")}`,
        };
      }
    }
  }
  if (key === "7d") return { key, from: new Date(+now - 7 * DAY), to: now, unit: "day", label: "Last 7 days" };
  if (key === "30d") return { key, from: new Date(+now - 30 * DAY), to: now, unit: "day", label: "Last 30 days" };
  return { key: "24h", from: new Date(+now - DAY), to: now, unit: "hour", label: "Last 24 hours" };
}

export function previousRange(r: Range): Range {
  const span = +r.to - +r.from;
  return { ...r, from: new Date(+r.from - span), to: new Date(r.from) };
}

export type Kpis = {
  requests: number;
  success: number;
  failed: number;
  refused: number;
  aborted: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p50LatencyMs: number | null;
  avgTtftMs: number | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  fallbacks: number;
  visitors: number;
  conversations: number;
};

export async function kpis(sql: Sql, r: Range): Promise<Kpis> {
  const [a] = await sql<Omit<Kpis, "visitors" | "conversations" | "successRate">[]>`
    SELECT
      count(*)::int AS requests,
      count(*) FILTER (WHERE status = 'success')::int AS success,
      count(*) FILTER (WHERE status = 'error')::int AS failed,
      count(*) FILTER (WHERE status = 'refused')::int AS refused,
      count(*) FILTER (WHERE status = 'aborted')::int AS aborted,
      avg(latency_ms) FILTER (WHERE status = 'success')::float8 AS "avgLatencyMs",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE status = 'success')::float8 AS "p95LatencyMs",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE status = 'success')::float8 AS "p50LatencyMs",
      avg(ttft_ms) FILTER (WHERE status = 'success')::float8 AS "avgTtftMs",
      coalesce(sum(input_tokens), 0)::float8 AS "inputTokens",
      coalesce(sum(output_tokens), 0)::float8 AS "outputTokens",
      coalesce(sum(cost_usd), 0)::float8 AS "costUsd",
      count(*) FILTER (WHERE fallback)::int AS fallbacks
    FROM ai_requests WHERE at >= ${r.from} AND at < ${r.to}`;
  const [v] = await sql<{ visitors: number }[]>`
    SELECT count(DISTINCT session_id)::int AS visitors FROM analytics_events
    WHERE name = 'page_view' AND at >= ${r.from} AND at < ${r.to}`;
  const [c] = await sql<{ conversations: number }[]>`
    SELECT count(DISTINCT session_id)::int AS conversations FROM ai_requests
    WHERE session_id IS NOT NULL AND at >= ${r.from} AND at < ${r.to}`;
  const settled = a.success + a.failed + a.refused;
  return { ...a, visitors: v.visitors, conversations: c.conversations, successRate: settled ? a.success / settled : null };
}

export type SeriesPoint = {
  t: string;
  success: number;
  failed: number;
  refused: number;
  costUsd: number;
  p95LatencyMs: number | null;
  avgLatencyMs: number | null;
  tokens: number;
};

export async function requestSeries(sql: Sql, r: Range): Promise<SeriesPoint[]> {
  const step = r.unit === "hour" ? "1 hour" : "1 day";
  const rows = await sql<(Omit<SeriesPoint, "t"> & { t: Date })[]>`
    WITH b AS (
      SELECT generate_series(date_trunc(${r.unit}, ${r.from}::timestamptz),
                             date_trunc(${r.unit}, ${r.to}::timestamptz - interval '1 millisecond'),
                             ${step}::interval) AS t
    )
    SELECT b.t,
      count(x.id) FILTER (WHERE x.status = 'success')::int AS success,
      count(x.id) FILTER (WHERE x.status = 'error')::int AS failed,
      count(x.id) FILTER (WHERE x.status = 'refused')::int AS refused,
      coalesce(sum(x.cost_usd), 0)::float8 AS "costUsd",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY x.latency_ms) FILTER (WHERE x.status = 'success')::float8 AS "p95LatencyMs",
      avg(x.latency_ms) FILTER (WHERE x.status = 'success')::float8 AS "avgLatencyMs",
      coalesce(sum(coalesce(x.input_tokens, 0) + coalesce(x.output_tokens, 0)), 0)::float8 AS tokens
    FROM b LEFT JOIN ai_requests x
      ON x.at >= b.t AND x.at < b.t + ${step}::interval AND x.at >= ${r.from} AND x.at < ${r.to}
    GROUP BY b.t ORDER BY b.t`;
  return rows.map((row) => ({ ...row, t: row.t.toISOString() }));
}

export async function visitorSeries(sql: Sql, r: Range): Promise<{ t: string; visitors: number; conversations: number }[]> {
  const step = r.unit === "hour" ? "1 hour" : "1 day";
  const rows = await sql<{ t: Date; visitors: number; conversations: number }[]>`
    WITH b AS (
      SELECT generate_series(date_trunc(${r.unit}, ${r.from}::timestamptz),
                             date_trunc(${r.unit}, ${r.to}::timestamptz - interval '1 millisecond'),
                             ${step}::interval) AS t
    )
    SELECT b.t,
      (SELECT count(DISTINCT e.session_id) FROM analytics_events e
        WHERE e.name = 'page_view' AND e.at >= b.t AND e.at < b.t + ${step}::interval
          AND e.at >= ${r.from} AND e.at < ${r.to})::int AS visitors,
      (SELECT count(DISTINCT q.session_id) FROM ai_requests q
        WHERE q.session_id IS NOT NULL AND q.at >= b.t AND q.at < b.t + ${step}::interval
          AND q.at >= ${r.from} AND q.at < ${r.to})::int AS conversations
    FROM b ORDER BY b.t`;
  return rows.map((row) => ({ ...row, t: row.t.toISOString() }));
}

export type ModelRow = {
  model: string;
  requests: number;
  success: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  p95LatencyMs: number | null;
  avgLatencyMs: number | null;
  fallbacks: number;
};

export async function byModel(sql: Sql, r: Range): Promise<ModelRow[]> {
  return sql<ModelRow[]>`
    SELECT coalesce(served_model, model) AS model,
      count(*)::int AS requests,
      count(*) FILTER (WHERE status = 'success')::int AS success,
      count(*) FILTER (WHERE status = 'error')::int AS failed,
      coalesce(sum(input_tokens), 0)::float8 AS "inputTokens",
      coalesce(sum(output_tokens), 0)::float8 AS "outputTokens",
      coalesce(sum(cost_usd), 0)::float8 AS "costUsd",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE status = 'success')::float8 AS "p95LatencyMs",
      avg(latency_ms) FILTER (WHERE status = 'success')::float8 AS "avgLatencyMs",
      count(*) FILTER (WHERE fallback)::int AS fallbacks
    FROM ai_requests WHERE at >= ${r.from} AND at < ${r.to}
    GROUP BY 1 ORDER BY requests DESC`;
}

export async function errorCategories(sql: Sql, r: Range): Promise<{ category: string; count: number }[]> {
  return sql<{ category: string; count: number }[]>`
    SELECT coalesce(error_category, 'unknown') AS category, count(*)::int AS count
    FROM ai_requests WHERE status IN ('error', 'refused') AND at >= ${r.from} AND at < ${r.to}
    GROUP BY 1 ORDER BY count DESC`;
}

export type RequestRow = {
  id: string;
  at: Date;
  model: string;
  served_model: string | null;
  status: string;
  error_category: string | null;
  latency_ms: number | null;
  ttft_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  fallback: boolean;
  lang: string | null;
  turn_count: number | null;
};

export const REQUEST_STATUSES = ["success", "error", "refused", "aborted"] as const;

export async function requestPage(
  sql: Sql,
  r: Range,
  opts: { status?: string; model?: string; q?: string; page: number; pageSize: number },
): Promise<{ rows: RequestRow[]; total: number }> {
  const status = (REQUEST_STATUSES as readonly string[]).includes(opts.status ?? "") ? opts.status! : null;
  const model = opts.model && /^[a-z0-9.-]{3,64}$/.test(opts.model) ? opts.model : null;
  const q = opts.q && /^[0-9a-f-]{4,36}$/i.test(opts.q) ? opts.q.toLowerCase() : null;
  const where = sql`
    at >= ${r.from} AND at < ${r.to}
    ${status ? sql`AND status = ${status}` : sql``}
    ${model ? sql`AND coalesce(served_model, model) = ${model}` : sql``}
    ${q ? sql`AND id::text LIKE ${q + "%"}` : sql``}`;
  const [{ total }] = await sql<{ total: number }[]>`SELECT count(*)::int AS total FROM ai_requests WHERE ${where}`;
  const rows = await sql<RequestRow[]>`
    SELECT id, at, model, served_model, status, error_category, latency_ms, ttft_ms, input_tokens, output_tokens,
      cost_usd::float8 AS cost_usd, fallback, lang, turn_count
    FROM ai_requests WHERE ${where}
    ORDER BY at DESC LIMIT ${opts.pageSize} OFFSET ${(opts.page - 1) * opts.pageSize}`;
  return { rows, total };
}

export async function costByDay(sql: Sql, from: Date, to: Date) {
  const rows = await sql<{ t: Date; costUsd: number; inputTokens: number; outputTokens: number; failedCostUsd: number }[]>`
    WITH b AS (
      SELECT generate_series(date_trunc('day', ${from}::timestamptz), date_trunc('day', ${to}::timestamptz - interval '1 millisecond'), '1 day') AS t
    )
    SELECT b.t,
      coalesce(sum(x.cost_usd), 0)::float8 AS "costUsd",
      coalesce(sum(x.input_tokens), 0)::float8 AS "inputTokens",
      coalesce(sum(x.output_tokens), 0)::float8 AS "outputTokens",
      coalesce(sum(x.cost_usd) FILTER (WHERE x.status <> 'success'), 0)::float8 AS "failedCostUsd"
    FROM b LEFT JOIN ai_requests x ON x.at >= b.t AND x.at < b.t + interval '1 day' AND x.at >= ${from} AND x.at < ${to}
    GROUP BY b.t ORDER BY b.t`;
  return rows.map((row) => ({ ...row, t: row.t.toISOString() }));
}

export async function spendSummary(sql: Sql) {
  const [row] = await sql<{ mtd: number; today: number; prev7avg: number; daysElapsed: number; daysInMonth: number }[]>`
    SELECT
      coalesce((SELECT sum(cost_usd) FROM ai_requests WHERE at >= date_trunc('month', now())), 0)::float8 AS mtd,
      coalesce((SELECT sum(cost_usd) FROM ai_requests WHERE at >= date_trunc('day', now())), 0)::float8 AS today,
      coalesce((SELECT sum(cost_usd) FROM ai_requests
        WHERE at >= date_trunc('day', now()) - interval '7 days' AND at < date_trunc('day', now())), 0)::float8 / 7 AS prev7avg,
      (extract(epoch FROM now() - date_trunc('month', now())) / 86400)::float8 AS "daysElapsed",
      extract(day FROM date_trunc('month', now()) + interval '1 month' - interval '1 day')::float8 AS "daysInMonth"`;
  // Linear projection from the month so far; labelled as a projection in the UI.
  const projected = row.daysElapsed >= 1 ? (row.mtd / row.daysElapsed) * row.daysInMonth : null;
  return { ...row, projected };
}

export async function funnel(sql: Sql, r: Range) {
  const [row] = await sql<{ visited: number; opened: number; messaged: number; answered: number; ctaClicked: number; contacted: number }[]>`
    SELECT
      count(DISTINCT session_id) FILTER (WHERE name = 'page_view')::int AS visited,
      count(DISTINCT session_id) FILTER (WHERE name = 'chat_opened')::int AS opened,
      count(DISTINCT session_id) FILTER (WHERE name = 'message_sent')::int AS messaged,
      (SELECT count(DISTINCT session_id) FROM ai_requests WHERE status = 'success' AND session_id IS NOT NULL
         AND at >= ${r.from} AND at < ${r.to})::int AS answered,
      count(DISTINCT session_id) FILTER (WHERE name = 'cta_clicked')::int AS "ctaClicked",
      count(DISTINCT session_id) FILTER (WHERE name = 'contact_clicked')::int AS contacted
    FROM analytics_events WHERE at >= ${r.from} AND at < ${r.to}`;
  return row;
}

export async function eventCounts(sql: Sql, r: Range) {
  return sql<{ name: string; count: number; sessions: number }[]>`
    SELECT name, count(*)::int AS count, count(DISTINCT session_id)::int AS sessions
    FROM analytics_events WHERE at >= ${r.from} AND at < ${r.to}
    GROUP BY name ORDER BY count DESC`;
}

export async function propBreakdown(sql: Sql, r: Range, name: string, prop: string) {
  return sql<{ value: string; count: number }[]>`
    SELECT coalesce(props->>${prop}, 'unknown') AS value, count(*)::int AS count
    FROM analytics_events WHERE name = ${name} AND at >= ${r.from} AND at < ${r.to}
    GROUP BY 1 ORDER BY count DESC`;
}

export async function languageBreakdown(sql: Sql, r: Range) {
  return sql<{ value: string; count: number }[]>`
    SELECT coalesce(lang, 'unknown') AS value, count(*)::int AS count
    FROM ai_requests WHERE at >= ${r.from} AND at < ${r.to} AND status <> 'aborted'
    GROUP BY 1 ORDER BY count DESC`;
}

export async function errorSeries(sql: Sql, r: Range, fingerprint?: string) {
  const step = r.unit === "hour" ? "1 hour" : "1 day";
  const rows = await sql<{ t: Date; count: number }[]>`
    WITH b AS (
      SELECT generate_series(date_trunc(${r.unit}, ${r.from}::timestamptz),
                             date_trunc(${r.unit}, ${r.to}::timestamptz - interval '1 millisecond'),
                             ${step}::interval) AS t
    )
    SELECT b.t, count(e.id)::int AS count
    FROM b LEFT JOIN error_events e ON e.at >= b.t AND e.at < b.t + ${step}::interval
      AND e.at >= ${r.from} AND e.at < ${r.to}
      ${fingerprint ? sql`AND e.fingerprint = ${fingerprint}` : sql``}
    GROUP BY b.t ORDER BY b.t`;
  return rows.map((row) => ({ t: row.t.toISOString(), count: row.count }));
}
