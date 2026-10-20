import Anthropic from "@anthropic-ai/sdk";
import type { ErrorCode } from "../chatProtocol";
import type { ErrorInput } from "./errors";

export type Classified = { code: ErrorCode; category: string; severity: ErrorInput["severity"]; httpStatus: number | null };

/** Maps a provider/SDK failure to a visitor-facing code and an internal diagnostic category. */
export function classifyError(err: unknown): Classified {
  const status = err instanceof Anthropic.APIError && typeof err.status === "number" ? err.status : null;
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { code: "upstream", category: "timeout", severity: "medium", httpStatus: null };
  if (err instanceof Anthropic.APIConnectionError) return { code: "upstream", category: "connection", severity: "high", httpStatus: null };
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { code: "not_configured", category: "auth", severity: "critical", httpStatus: status };
  }
  if (err instanceof Anthropic.RateLimitError) return { code: "rate_limited", category: "provider_rate_limit", severity: "high", httpStatus: status };
  if (/credit balance|billing|insufficient.*(credit|funds)/i.test(message)) {
    // e.g. "Your credit balance is too low" — show the contact fallback, not a generic error.
    return { code: "not_configured", category: "billing", severity: "critical", httpStatus: status };
  }
  if (status === 529 || /overloaded/i.test(message)) return { code: "upstream", category: "overloaded", severity: "high", httpStatus: status };
  if (err instanceof Anthropic.NotFoundError) return { code: "upstream", category: "model_not_found", severity: "critical", httpStatus: status };
  if (err instanceof Anthropic.BadRequestError) return { code: "upstream", category: "bad_request", severity: "high", httpStatus: status };
  if (err instanceof Anthropic.InternalServerError) return { code: "upstream", category: "provider_error", severity: "high", httpStatus: status };
  if (err instanceof Anthropic.APIError) return { code: "upstream", category: "provider_error", severity: "high", httpStatus: status };
  return { code: "server", category: "internal", severity: "high", httpStatus: null };
}
