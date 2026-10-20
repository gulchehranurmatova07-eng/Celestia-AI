import { createHash } from "node:crypto";
import { getDb } from "./db";

export type Severity = "critical" | "high" | "medium" | "low";
export type ErrorSource = "ai" | "backend" | "frontend" | "database" | "auth" | "config" | "integration";

export type ErrorInput = {
  source: ErrorSource;
  category: string;
  severity: Severity;
  title: string;
  message: string;
  detail?: Record<string, unknown>;
  requestId?: string | null;
  path?: string | null;
};

/** Normalizes volatile parts (ids, numbers, quoted values) so repeats group together. */
export function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>")
    .replace(/\b(req|msg|request)_[a-z0-9]+/g, "<id>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/"[^"]{0,200}"|'[^']{0,200}'/g, "<str>")
    .replace(/\d+(\.\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export function fingerprint(source: string, category: string, message: string): string {
  return createHash("sha1").update(`${source}|${category}|${normalizeMessage(message)}`).digest("hex").slice(0, 20);
}

const SECRET_PATTERNS = [/sk-ant-[A-Za-z0-9_-]+/g, /postgres(ql)?:\/\/[^\s]+/gi, /Bearer\s+[A-Za-z0-9._-]+/gi];

/** Removes secrets that might appear in provider error messages or stacks. */
export function redact(text: string): string {
  return SECRET_PATTERNS.reduce((t, re) => t.replace(re, "[redacted]"), text);
}

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/** Records an error occurrence and updates its group. Never throws. */
export async function recordError(input: ErrorInput): Promise<void> {
  try {
    const sql = await getDb();
    if (!sql) return;
    const message = redact(input.message).slice(0, 2000);
    const fp = fingerprint(input.source, input.category, message);
    await sql.begin(async (tx) => {
      const [existing] = await tx<{ severity: Severity; status: string }[]>`
        SELECT severity, status FROM error_groups WHERE fingerprint = ${fp} FOR UPDATE`;
      if (!existing) {
        await tx`
          INSERT INTO error_groups (fingerprint, source, category, severity, title, count)
          VALUES (${fp}, ${input.source}, ${input.category}, ${input.severity}, ${redact(input.title).slice(0, 200)}, 1)
          ON CONFLICT (fingerprint) DO UPDATE SET count = error_groups.count + 1, last_seen = now()`;
      } else {
        const severity = SEVERITY_RANK[input.severity] > SEVERITY_RANK[existing.severity] ? input.severity : existing.severity;
        // A resolved issue that happens again is reopened (regression).
        const reopen = existing.status === "resolved";
        await tx`
          UPDATE error_groups SET count = count + 1, last_seen = now(), severity = ${severity},
            status = ${reopen ? "open" : existing.status},
            resolved_at = CASE WHEN ${reopen}::boolean THEN NULL ELSE resolved_at END, updated_at = now()
          WHERE fingerprint = ${fp}`;
        if (reopen) {
          await tx`INSERT INTO error_notes (fingerprint, kind, body) VALUES (${fp}, 'status', 'Reopened automatically: the error occurred again after being resolved.')`;
        }
      }
      await tx`
        INSERT INTO error_events (fingerprint, message, detail, request_id, path)
        VALUES (${fp}, ${message}, ${tx.json(JSON.parse(redact(JSON.stringify(input.detail ?? {}))) as never)},
                ${input.requestId ?? null}, ${input.path?.slice(0, 300) ?? null})`;
    });
  } catch (err) {
    console.error("[celestia-ai] failed to record error:", err instanceof Error ? err.message : err);
  }
}
