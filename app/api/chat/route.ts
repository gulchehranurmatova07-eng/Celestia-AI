import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { SYSTEM_PROMPT, languageHint } from "@/lib/knowledge";
import { DEFAULT_LANG, isLang, type LangCode } from "@/lib/i18n";
import { checkRateLimit } from "@/lib/rateLimit";
import { classifyError, type Classified } from "@/lib/server/aiErrors";
import { recordError } from "@/lib/server/errors";
import { clientIp } from "@/lib/server/security";
import { getSettings } from "@/lib/server/settings";
import { recordAiRequest, sessionIdFrom, type AiRequestRecord } from "@/lib/server/telemetry";
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

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

function errorResponse(code: ErrorCode, status: number, requestId: string, headers?: HeadersInit) {
  return NextResponse.json({ error: code, requestId }, { status, headers: { "X-Request-Id": requestId, ...headers } });
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

function emptyRecord(id: string, sessionId: string | null, model: string): AiRequestRecord {
  return {
    id,
    sessionId,
    lang: null,
    model,
    servedModel: null,
    status: "error",
    errorCategory: null,
    httpStatus: null,
    latencyMs: 0,
    ttftMs: null,
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    fallback: false,
    turnCount: 0,
  };
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const started = Date.now();
  const sessionId = sessionIdFrom(req.headers.get("x-celestia-session"));

  const settings = await getSettings();
  const rejected = (category: string) =>
    recordAiRequest({
      ...emptyRecord(requestId, sessionId, settings["ai.model"]),
      errorCategory: category,
      latencyMs: Date.now() - started,
    });

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    await rejected("not_configured");
    await recordError({
      source: "config",
      category: "missing_api_key",
      severity: "high",
      title: "ANTHROPIC_API_KEY is not set",
      message: "Chat request rejected: ANTHROPIC_API_KEY is not configured on the server",
      requestId,
      path: "/api/chat",
    });
    return errorResponse("not_configured", 503, requestId);
  }

  if (!settings["chat.enabled"]) return errorResponse("maintenance", 503, requestId);

  const limit = checkRateLimit(clientIp(req.headers), settings["chat.rateLimitPerMinute"]);
  if (!limit.ok) {
    await rejected("rate_limited");
    return errorResponse("rate_limited", 429, requestId, { "Retry-After": String(limit.retryAfterSec) });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 200_000) return errorResponse("too_long", 413, requestId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", 400, requestId);
  }
  const parsed = parseBody(body);
  if (!parsed.ok) return errorResponse(parsed.code, parsed.code === "too_long" ? 413 : 400, requestId);
  const { messages, lang } = parsed.value;
  const model = settings["ai.model"];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // Stream already closed by the client.
        }
      };

      const record: AiRequestRecord = {
        ...emptyRecord(requestId, sessionId, model),
        lang,
        turnCount: Math.ceil(messages.length / 2),
      };
      let failure: { classified: Classified; message: string } | null = null;

      try {
        const upstream = getClient().beta.messages.stream(
          {
            model,
            max_tokens: settings["ai.maxTokens"],
            output_config: { effort: settings["ai.effort"] },
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

        let sent = false;
        for await (const event of upstream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            if (!sent) record.ttftMs = Date.now() - started;
            sent = true;
            send({ type: "delta", text: event.delta.text });
          }
        }
        const final = await upstream.finalMessage();
        record.servedModel = final.model;
        record.inputTokens = final.usage.input_tokens;
        record.outputTokens = final.usage.output_tokens;
        record.cacheReadTokens = final.usage.cache_read_input_tokens ?? 0;
        record.cacheWriteTokens = final.usage.cache_creation_input_tokens ?? 0;
        record.fallback = (final.usage.iterations ?? []).some((it) => it.type === "fallback_message");

        if (final.stop_reason === "refusal") {
          record.status = "refused";
          record.errorCategory = "refusal";
          send({ type: "error", code: "refused", requestId });
        } else if (!sent) {
          record.errorCategory = "empty_response";
          failure = {
            classified: { code: "upstream", category: "empty_response", severity: "medium", httpStatus: 200 },
            message: `Model returned no text (stop_reason: ${final.stop_reason})`,
          };
          send({ type: "error", code: "upstream", requestId });
        } else {
          record.status = "success";
          send({ type: "done" });
        }
      } catch (err) {
        if (req.signal.aborted) {
          record.status = "aborted";
          record.errorCategory = "client_aborted";
        } else {
          const classified = classifyError(err);
          record.errorCategory = classified.category;
          record.httpStatus = classified.httpStatus;
          failure = { classified, message: err instanceof Error ? err.message : String(err) };
          console.error(`[celestia-ai] chat request ${requestId} failed (${classified.category}):`, failure.message);
          send({ type: "error", code: classified.code, requestId });
        }
      } finally {
        record.latencyMs = Date.now() - started;
        // Write diagnostics before closing so serverless runtimes don't freeze mid-write.
        await recordAiRequest(record);
        if (failure) {
          await recordError({
            source: "ai",
            category: failure.classified.category,
            severity: failure.classified.severity,
            title: `AI generation failed: ${failure.classified.category}`,
            message: failure.message,
            detail: { model, httpStatus: failure.classified.httpStatus, latencyMs: record.latencyMs },
            requestId,
            path: "/api/chat",
          });
        }
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
      "X-Request-Id": requestId,
    },
  });
}
