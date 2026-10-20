// Suggested checks per error category. These are hypotheses to verify, not
// confirmed root causes — the UI labels them that way.
export const TROUBLESHOOTING: Record<string, string[]> = {
  missing_api_key: [
    "In Vercel → Project → Settings → Environment Variables, add ANTHROPIC_API_KEY, then redeploy.",
    "Until then visitors see the contact links instead of AI answers (by design).",
  ],
  billing: [
    "Open Claude Console → Billing and check the credit balance; add credits if it is $0.",
    "Check Console → Settings → Limits for a monthly spend limit that may have been reached.",
  ],
  auth: [
    "The API key may be invalid, revoked or from another workspace. Create a new key in Claude Console and update ANTHROPIC_API_KEY.",
  ],
  provider_rate_limit: [
    "Your Anthropic organization hit a rate limit. Check Console → Limits for your tier.",
    "Lower the per-visitor rate limit in Settings, or move to a higher usage tier.",
  ],
  overloaded: [
    "Anthropic reported temporary overload (HTTP 529). This is usually transient; check status.anthropic.com.",
    "If it persists, consider switching the model in Settings.",
  ],
  timeout: ["The provider did not respond within 60 s. Check status.anthropic.com and the p95 latency trend.", "Lower “Max output tokens” if answers are very long."],
  connection: ["The server couldn’t reach the Anthropic API. Check status.anthropic.com and your hosting region’s network status."],
  model_not_found: ["The configured model may not be available to your account. Choose another model in Settings and verify with System Health → Run checks."],
  bad_request: ["Check recent Settings changes (model, effort, max tokens) in the Audit Log — a recent change is a likely suspect.", "Compare with the latest deployment commit."],
  provider_error: ["Anthropic returned a server error. Usually transient; check status.anthropic.com."],
  empty_response: ["The model returned no text. Check “Max output tokens” in Settings and the request’s stop reason."],
  login_failed: ["Repeated failures may indicate password guessing. Review auth.login_failed entries in the Audit Log by IP and email.", "Lockout after 5 failures per 15 minutes is automatic."],
  exception: ["Open an event to see the browser user agent and stack. Try reproducing on that browser.", "Check whether the error started after a deployment."],
  unhandled_rejection: ["Open an event for the stack trace; usually a failed network call or an unexpected response shape."],
  database_down: ["Check your database provider’s dashboard and that DATABASE_URL is correct.", "Neon free databases may suspend when idle; the first query wakes them."],
  ai_provider_down: ["Run System Health checks again. If it fails with HTTP 401/403, the API key is invalid; with 404, the model isn’t available."],
};

export function troubleshootingFor(category: string): string[] {
  return TROUBLESHOOTING[category] ?? ["Inspect recent events and related requests below; compare first-seen time with the latest deployment and settings changes."];
}
