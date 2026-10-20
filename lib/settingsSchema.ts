// Admin-configurable settings: definitions, defaults and validation.
// Shared by the server (enforcement) and the admin UI (forms). No secrets here —
// secrets stay in environment variables and are only ever shown as "configured".

export const MODEL_OPTIONS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type ModelId = (typeof MODEL_OPTIONS)[number];

export type ModelPrice = {
  /** USD per million tokens */
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

export type Pricing = { asOf: string; source: string; models: Record<string, ModelPrice> };

// Anthropic list prices (USD / 1M tokens) as of the date below. Cache-write is
// estimated at 1.25× input. Verify at https://www.anthropic.com/pricing and
// update from Settings → Pricing when they change. All costs derived from this
// table are ESTIMATES; the Claude Console billing page is the confirmed source.
export const DEFAULT_PRICING: Pricing = {
  asOf: "2026-10-06",
  source: "Anthropic list prices (cache-write estimated at 1.25× input)",
  models: {
    "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
    "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
    "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
    "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
    "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  },
};

export type AppSettings = {
  "ai.model": ModelId;
  "ai.effort": "low" | "medium" | "high";
  "ai.maxTokens": number;
  "chat.enabled": boolean;
  "chat.rateLimitPerMinute": number;
  "budget.monthlyUsd": number;
  "budget.spikeMultiplier": number;
  "alerts.errorRatePct": number;
  "alerts.p95LatencyMs": number;
  "retention.days": number;
  pricing: Pricing;
};

export type SettingKey = keyof AppSettings;

export function defaultSettings(env: Record<string, string | undefined> = {}): AppSettings {
  const envModel = env.CELESTIA_MODEL?.trim();
  return {
    "ai.model": (MODEL_OPTIONS as readonly string[]).includes(envModel ?? "") ? (envModel as ModelId) : "claude-opus-5-5",
    "ai.effort": "low",
    "ai.maxTokens": 4096,
    "chat.enabled": true,
    "chat.rateLimitPerMinute": Number(env.CELESTIA_RATE_LIMIT_PER_MINUTE) || 12,
    "budget.monthlyUsd": 0,
    "budget.spikeMultiplier": 3,
    "alerts.errorRatePct": 10,
    "alerts.p95LatencyMs": 20000,
    "retention.days": 90,
    pricing: DEFAULT_PRICING,
  };
}

export const SETTING_META: Record<SettingKey, { label: string; help: string; group: string; impact?: "high" }> = {
  "ai.model": { label: "AI model", help: "Model used for public chat answers.", group: "AI", impact: "high" },
  "ai.effort": { label: "Reasoning effort", help: "Higher effort = deeper answers, more tokens and latency.", group: "AI" },
  "ai.maxTokens": { label: "Max output tokens", help: "Upper bound for a single answer (256–8192).", group: "AI" },
  "chat.enabled": {
    label: "Public chat enabled",
    help: "Turn off to put the chat in maintenance mode. Visitors see your contact links instead.",
    group: "Chat",
    impact: "high",
  },
  "chat.rateLimitPerMinute": { label: "Rate limit (per visitor IP / minute)", help: "1–120 requests.", group: "Chat" },
  "budget.monthlyUsd": { label: "Monthly budget (USD)", help: "Alert at 80% and 100% of estimated spend. 0 turns it off.", group: "Budget & alerts" },
  "budget.spikeMultiplier": { label: "Spend spike multiplier", help: "Alert when today's cost exceeds N × the 7-day daily average.", group: "Budget & alerts" },
  "alerts.errorRatePct": { label: "Error-rate alert (%)", help: "Alert when failures in the last hour exceed this share (min. 10 requests).", group: "Budget & alerts" },
  "alerts.p95LatencyMs": { label: "p95 latency alert (ms)", help: "Alert when p95 latency in the last hour exceeds this (min. 10 requests).", group: "Budget & alerts" },
  "retention.days": { label: "Data retention (days)", help: "Requests, events, errors and health checks older than this are purged (7–365).", group: "Data" },
  pricing: { label: "Model pricing table", help: "USD per million tokens, used for cost estimates.", group: "Pricing" },
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validates a single setting. Returns the normalized value or an error message. */
export function validateSetting<K extends SettingKey>(
  key: K,
  value: unknown,
): { ok: true; value: AppSettings[K] } | { ok: false; error: string } {
  const ok = <T,>(v: T) => ({ ok: true as const, value: v as unknown as AppSettings[K] });
  const fail = (error: string) => ({ ok: false as const, error });

  switch (key) {
    case "ai.model":
      return (MODEL_OPTIONS as readonly unknown[]).includes(value) ? ok(value) : fail("Unsupported model");
    case "ai.effort":
      return value === "low" || value === "medium" || value === "high" ? ok(value) : fail("Effort must be low, medium or high");
    case "ai.maxTokens":
      return isNum(value) && Number.isInteger(value) && value >= 256 && value <= 8192 ? ok(value) : fail("Must be an integer 256–8192");
    case "chat.enabled":
      return typeof value === "boolean" ? ok(value) : fail("Must be true or false");
    case "chat.rateLimitPerMinute":
      return isNum(value) && Number.isInteger(value) && value >= 1 && value <= 120 ? ok(value) : fail("Must be an integer 1–120");
    case "budget.monthlyUsd":
      return isNum(value) && value >= 0 && value <= 100000 ? ok(Math.round(value * 100) / 100) : fail("Must be 0–100000");
    case "budget.spikeMultiplier":
      return isNum(value) && value >= 1.5 && value <= 50 ? ok(value) : fail("Must be 1.5–50");
    case "alerts.errorRatePct":
      return isNum(value) && value >= 1 && value <= 100 ? ok(value) : fail("Must be 1–100");
    case "alerts.p95LatencyMs":
      return isNum(value) && Number.isInteger(value) && value >= 1000 && value <= 120000 ? ok(value) : fail("Must be 1000–120000");
    case "retention.days":
      return isNum(value) && Number.isInteger(value) && value >= 7 && value <= 365 ? ok(value) : fail("Must be an integer 7–365");
    case "pricing": {
      if (!value || typeof value !== "object") return fail("Invalid pricing table");
      const p = value as Partial<Pricing>;
      if (typeof p.asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.asOf)) return fail("asOf must be a YYYY-MM-DD date");
      if (!p.models || typeof p.models !== "object") return fail("models is required");
      const models: Record<string, ModelPrice> = {};
      for (const [id, price] of Object.entries(p.models)) {
        if (!/^[a-z0-9.-]{3,64}$/.test(id)) return fail(`Invalid model id: ${id}`);
        const pr = price as Partial<ModelPrice>;
        for (const f of ["input", "output", "cacheRead", "cacheWrite"] as const) {
          if (!isNum(pr?.[f]) || (pr[f] as number) < 0 || (pr[f] as number) > 1000) return fail(`${id}.${f} must be 0–1000`);
        }
        models[id] = { input: pr.input!, output: pr.output!, cacheRead: pr.cacheRead!, cacheWrite: pr.cacheWrite! };
      }
      return ok({ asOf: p.asOf, source: String(p.source ?? "Custom").slice(0, 200), models });
    }
    default:
      return fail("Unknown setting");
  }
}

export function isSettingKey(key: unknown): key is SettingKey {
  return typeof key === "string" && key in SETTING_META;
}

/** Estimated USD cost of one request from token usage and the pricing table. */
export function estimateCost(
  pricing: Pricing,
  model: string,
  usage: { input?: number | null; output?: number | null; cacheRead?: number | null; cacheWrite?: number | null },
): number | null {
  const price = pricing.models[model];
  if (!price) return null;
  const m = 1_000_000;
  return (
    ((usage.input ?? 0) * price.input +
      (usage.output ?? 0) * price.output +
      (usage.cacheRead ?? 0) * price.cacheRead +
      (usage.cacheWrite ?? 0) * price.cacheWrite) /
    m
  );
}
