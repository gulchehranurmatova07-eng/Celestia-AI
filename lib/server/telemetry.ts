import { estimateCost } from "../settingsSchema";
import { getDb } from "./db";
import { getSettings } from "./settings";

export type AiRequestRecord = {
  id: string;
  sessionId: string | null;
  lang: string | null;
  model: string;
  servedModel: string | null;
  status: "success" | "error" | "refused" | "aborted";
  errorCategory: string | null;
  httpStatus: number | null;
  latencyMs: number;
  ttftMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  fallback: boolean;
  turnCount: number;
};

/** Stores one chat generation's metadata (never the conversation text). Never throws. */
export async function recordAiRequest(r: AiRequestRecord): Promise<void> {
  try {
    const sql = await getDb();
    if (!sql) return;
    const settings = await getSettings();
    const cost =
      r.inputTokens === null && r.outputTokens === null
        ? null
        : estimateCost(settings.pricing, r.servedModel ?? r.model, {
            input: r.inputTokens,
            output: r.outputTokens,
            cacheRead: r.cacheReadTokens,
            cacheWrite: r.cacheWriteTokens,
          });
    await sql`
      INSERT INTO ai_requests (id, session_id, lang, model, served_model, status, error_category, http_status,
        latency_ms, ttft_ms, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, fallback, turn_count)
      VALUES (${r.id}, ${r.sessionId}, ${r.lang}, ${r.model}, ${r.servedModel}, ${r.status}, ${r.errorCategory}, ${r.httpStatus},
        ${r.latencyMs}, ${r.ttftMs}, ${r.inputTokens}, ${r.outputTokens}, ${r.cacheReadTokens}, ${r.cacheWriteTokens},
        ${cost}, ${r.fallback}, ${r.turnCount})`;
  } catch (err) {
    console.error("[celestia-ai] failed to record AI request:", err instanceof Error ? err.message : err);
  }
}

export const SESSION_ID_RE = /^[a-z0-9]{16,40}$/;

export function sessionIdFrom(value: unknown): string | null {
  return typeof value === "string" && SESSION_ID_RE.test(value) ? value : null;
}
