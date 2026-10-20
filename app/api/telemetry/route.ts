import { isLang } from "@/lib/i18n";
import { checkRateLimit } from "@/lib/rateLimit";
import { getDb } from "@/lib/server/db";
import { recordError } from "@/lib/server/errors";
import { cleanText, clientIp } from "@/lib/server/security";
import { sessionIdFrom } from "@/lib/server/telemetry";
import { TELEMETRY_EVENTS, type TelemetryEventName } from "@/lib/telemetryEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anonymous product analytics. Accepts only allowlisted events with small, typed
// properties. No message content, no IP addresses, no cookies are stored.

const noContent = () => new Response(null, { status: 204 });

function cleanProps(name: TelemetryEventName, raw: unknown): Record<string, string> | null {
  const allowed = TELEMETRY_EVENTS[name];
  const props: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [key, values] of Object.entries(allowed)) {
      const v = (raw as Record<string, unknown>)[key];
      if (typeof v === "string" && (values.length === 0 ? v.length <= 40 : values.includes(v))) props[key] = v;
    }
  }
  return props;
}

export async function POST(req: Request) {
  // Telemetry must never break or slow the site: failures are silent.
  if (!checkRateLimit(`t:${clientIp(req.headers)}`, 120).ok) return noContent();
  const text = await req.text().catch(() => "");
  if (!text || text.length > 8000) return noContent();
  let body: { sid?: unknown; lang?: unknown; events?: unknown; error?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return noContent();
  }
  const sid = sessionIdFrom(body.sid);
  if (!sid) return noContent();
  const lang = isLang(body.lang) ? body.lang : null;

  if (body.error && typeof body.error === "object") {
    const e = body.error as Record<string, unknown>;
    const message = cleanText(e.message, 500);
    if (message) {
      await recordError({
        source: "frontend",
        category: cleanText(e.kind, 30) ?? "exception",
        severity: "medium",
        title: `Frontend: ${message.slice(0, 120)}`,
        message,
        detail: { stack: cleanText(e.stack, 1500), userAgent: (req.headers.get("user-agent") ?? "").slice(0, 200) },
        path: cleanText(e.path, 200),
      });
    }
  }

  if (Array.isArray(body.events) && body.events.length > 0) {
    const rows = body.events
      .slice(0, 20)
      .filter((ev): ev is { name: TelemetryEventName; props?: unknown } =>
        !!ev && typeof ev === "object" && typeof (ev as { name?: unknown }).name === "string" && (ev as { name: string }).name in TELEMETRY_EVENTS,
      )
      .map((ev) => ({ session_id: sid, name: ev.name, lang, props: cleanProps(ev.name, ev.props) ?? {} }));
    if (rows.length > 0) {
      try {
        const sql = await getDb();
        if (sql) await sql`INSERT INTO analytics_events ${sql(rows, "session_id", "name", "lang", "props")}`;
      } catch (err) {
        console.error("[celestia-ai] telemetry insert failed:", err instanceof Error ? err.message : err);
      }
    }
  }
  return noContent();
}
