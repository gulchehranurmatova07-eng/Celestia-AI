import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { canAssignRole, can, ROLES } from "@/lib/roles";
import { DEFAULT_PRICING, estimateCost, validateSetting } from "@/lib/settingsSchema";
import { classifyError } from "@/lib/server/aiErrors";
import { fingerprint, normalizeMessage, redact } from "@/lib/server/errors";
import { parseRange } from "@/lib/server/metrics";
import { hashPassword, isSameOrigin, passwordProblem, safeEqual, verifyPassword } from "@/lib/server/security";

describe("passwords", () => {
  it("hashes with scrypt and verifies only the right password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });

  it("rejects weak passwords", () => {
    expect(passwordProblem("short")).toMatch(/at least/);
    expect(passwordProblem("aaaaaaaaaaaaaa")).toMatch(/simple/);
    expect(passwordProblem("a-Long-enough-pass")).toBeNull();
  });

  it("compares secrets safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("CSRF origin check", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("accepts same origin and rejects others", () => {
    expect(isSameOrigin(h({ host: "site.app", origin: "https://site.app" }))).toBe(true);
    expect(isSameOrigin(h({ host: "site.app", origin: "https://evil.app" }))).toBe(false);
    expect(isSameOrigin(h({ host: "site.app" }))).toBe(false);
    expect(isSameOrigin(h({ host: "site.app", referer: "https://site.app/admin" }))).toBe(true);
  });
});

describe("roles", () => {
  it("grants least privilege", () => {
    expect(can("analyst", "settings.manage")).toBe(false);
    expect(can("analyst", "export.data")).toBe(true);
    expect(can("support", "errors.manage")).toBe(true);
    expect(can("support", "team.manage")).toBe(false);
    expect(can("admin", "data.purge")).toBe(false);
    for (const r of ROLES) expect(can(r, "dashboard.view")).toBe(true);
  });

  it("only owners can create or modify owners", () => {
    expect(canAssignRole("admin", "owner")).toBe(false);
    expect(canAssignRole("admin", "support", "owner")).toBe(false);
    expect(canAssignRole("admin", "analyst", "support")).toBe(true);
    expect(canAssignRole("owner", "owner")).toBe(true);
    expect(canAssignRole("support", "analyst")).toBe(false);
  });
});

describe("error grouping", () => {
  it("normalizes volatile parts", () => {
    expect(normalizeMessage("Request req_011abc failed after 5321 ms")).toBe(normalizeMessage("Request req_99zz failed after 12 ms"));
    expect(fingerprint("ai", "timeout", "a 1")).toBe(fingerprint("ai", "timeout", "a 2"));
    expect(fingerprint("ai", "timeout", "a")).not.toBe(fingerprint("ai", "overloaded", "a"));
  });
  it("redacts secrets", () => {
    expect(redact("key sk-ant-api03-abcDEF_123 leaked")).toBe("key [redacted] leaked");
    expect(redact("postgres://user:pw@host/db")).toBe("[redacted]");
  });
});

describe("cost & settings", () => {
  it("estimates cost from the pricing table", () => {
    const c = estimateCost(DEFAULT_PRICING, "claude-haiku-5-5", { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 });
    expect(c).toBeCloseTo(0.6, 10);
    expect(estimateCost(DEFAULT_PRICING, "unknown-model", { input: 1 })).toBeNull();
  });
  it("validates settings", () => {
    expect(validateSetting("ai.model", "claude-haiku-5-5").ok).toBe(true);
    expect(validateSetting("ai.model", "gpt-4").ok).toBe(false);
    expect(validateSetting("retention.days", 3).ok).toBe(false);
    expect(validateSetting("chat.enabled", "yes").ok).toBe(false);
    expect(validateSetting("pricing", { asOf: "2026-01-01", models: { "m-1": { input: -1, output: 1, cacheRead: 0, cacheWrite: 0 } } }).ok).toBe(false);
  });
});

describe("ranges", () => {
  it("parses presets and bounded custom ranges", () => {
    expect(parseRange({}).key).toBe("24h");
    expect(parseRange({ range: "7d" }).unit).toBe("day");
    const c = parseRange({ range: "custom", from: "2026-01-01", to: "2026-01-10" });
    expect(c.key).toBe("custom");
    expect(parseRange({ range: "custom", from: "2020-01-01", to: "2026-01-10" }).key).toBe("24h"); // > 180 days
  });
});

describe("AI error classification", () => {
  it("maps low credit balance to the contact fallback, not a generic error", () => {
    const err = new Anthropic.BadRequestError(400, { error: { message: "Your credit balance is too low to access the Anthropic API." } }, "Your credit balance is too low to access the Anthropic API.", new Headers());
    expect(classifyError(err)).toMatchObject({ code: "not_configured", category: "billing", severity: "critical" });
  });
  it("classifies rate limits and auth failures", () => {
    expect(classifyError(new Anthropic.RateLimitError(429, {}, "rate", new Headers())).category).toBe("provider_rate_limit");
    expect(classifyError(new Anthropic.AuthenticationError(401, {}, "bad key", new Headers())).code).toBe("not_configured");
    expect(classifyError(new Error("boom")).category).toBe("internal");
  });
});
