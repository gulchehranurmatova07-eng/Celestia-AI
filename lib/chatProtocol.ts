// Shared between the /api/chat route and the browser client.

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_HISTORY_MESSAGES = 30;
export const MAX_TOTAL_CHARS = 24_000;

export type ChatRole = "user" | "assistant";
export type ChatTurn = { role: ChatRole; content: string };

export type ErrorCode =
  | "not_configured"
  | "maintenance"
  | "rate_limited"
  | "invalid_request"
  | "too_long"
  | "refused"
  | "upstream"
  | "server";

// The response body is newline-delimited JSON, one event per line.
export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; code: ErrorCode; requestId?: string };
