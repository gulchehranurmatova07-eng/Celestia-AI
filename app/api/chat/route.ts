import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { SYSTEM_PROMPT, languageHint } from "@/lib/knowledge";
import { DEFAULT_LANG, isLang, type LangCode } from "@/lib/i18n";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_TOTAL_CHARS,
  type ChatTurn,
  type ErrorCode,
  type StreamEvent,
} from "@/lib/chatProtocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.CELESTIA_MODEL?.trim() || "claude-opus-5-5";
const RATE_LIMIT = Number(process.env.CELESTIA_RATE_LIMIT_PER_MINUTE) || 12;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

function errorResponse(code: ErrorCode, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: code }, { status, headers });
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function parseBody(body: unknown): { ok: true; value: { messages: ChatTurn[]; lang: LangCode } } | { ok: false; code: ErrorCode } {
  if (!body || typeof body !== "object") return { ok: false, code: "invalid_request" };
  const { messages, lang } = body as { messages?: unknown; lang?: unknown };
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_HISTORY_MESSAGES) {
    return { ok: false, code: "invalid_request" };
  }

  let total = 0;
  const turns: ChatTurn[] = [];
  for (const [i, m] of messages.entries()) {
    if (!m || typeof m !== "object") return { ok: false, code: "invalid_request" };
    const { role, content } = m as { role?: unknown; content?: unknown };
    const expectedRole = i % 2 === 0 ? "user" : "assistant";
    if (role !== expectedRole || typeof content !== "string") return { ok: false, code: "invalid_request" };
    const text = content.trim();
    if (!text) return { ok: false, code: "invalid_request" };
    if (role === "user" && text.length > MAX_MESSAGE_CHARS) return { ok: false, code: "too_long" };
    total += text.length;
    turns.push({ role: expectedRole, content: text });
  }
  if (total > MAX_TOTAL_CHARS) return { ok: false, code: "too_long" };
  if (turns[turns.length - 1].role !== "user") return { ok: false, code: "invalid_request" };

  return { ok: true, value: { messages: turns, lang: isLang(lang) ? lang : DEFAULT_LANG } };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return errorResponse("not_configured", 503);

  const limit = checkRateLimit(clientIp(req), RATE_LIMIT);
  if (!limit.ok) return errorResponse("rate_limited", 429, { "Retry-After": String(limit.retryAfterSec) });

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 200_000) return errorResponse("too_long", 413);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", 400);
  }
  const parsed = parseBody(body);
  if (!parsed.ok) return errorResponse(parsed.code, parsed.code === "too_long" ? 413 : 400);
  const { messages, lang } = parsed.value;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      const upstream = getClient().beta.messages.stream(
        {
          model: MODEL,
          max_tokens: 4096,
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
            { type: "text", text: languageHint(lang) },
          ],
          messages,
        },
        { signal: req.signal },
      );

      try {
        let sent = false;
        for await (const event of upstream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            sent = true;
            send({ type: "delta", text: event.delta.text });
          }
        }
        const final = await upstream.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "error", code: "refused" });
        } else if (!sent) {
          send({ type: "error", code: "upstream" });
        } else {
          send({ type: "done" });
        }
      } catch (err) {
        if (!req.signal.aborted) {
          let code: ErrorCode = "server";
          if (err instanceof Anthropic.RateLimitError) code = "rate_limited";
          else if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
            code = "not_configured";
          } else if (err instanceof Anthropic.APIError) code = "upstream";
          console.error("[celestia-ai] chat request failed:", err instanceof Error ? err.message : err);
          try {
            send({ type: "error", code });
          } catch {
            // Stream already closed by the client.
          }
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
