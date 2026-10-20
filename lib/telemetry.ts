"use client";

import type { TelemetryEventName } from "./telemetryEvents";

// Anonymous, batched analytics for the public site. A random per-tab id groups
// events into a visit; nothing personal or conversational is ever sent.

const SID_KEY = "celestia-sid";
let sid: string | null = null;
let lang: string | null = null;
let queue: { name: TelemetryEventName; props?: Record<string, string> }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let errorsSent = 0;

export function sessionId(): string {
  if (sid) return sid;
  try {
    sid = sessionStorage.getItem(SID_KEY);
  } catch {
    // Storage unavailable — fall back to an in-memory id.
  }
  if (!sid || !/^[a-z0-9]{16,40}$/.test(sid)) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    sid = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
    try {
      sessionStorage.setItem(SID_KEY, sid);
    } catch {
      // Ignore.
    }
  }
  return sid;
}

export function setTelemetryLang(value: string) {
  lang = value;
}

function post(payload: Record<string, unknown>) {
  const body = JSON.stringify({ sid: sessionId(), lang, ...payload });
  try {
    if (navigator.sendBeacon?.("/api/telemetry", new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // Fall through to fetch.
  }
  fetch("/api/telemetry", { method: "POST", body, keepalive: true }).catch(() => {});
}

function flush() {
  timer = null;
  if (queue.length === 0) return;
  const events = queue.splice(0, 20);
  post({ events });
  if (queue.length > 0) timer = setTimeout(flush, 0);
}

export function track(name: TelemetryEventName, props?: Record<string, string>) {
  if (typeof window === "undefined") return;
  queue.push({ name, props });
  timer ??= setTimeout(flush, 1500);
}

export function reportClientError(kind: string, message: string, stack?: string) {
  if (typeof window === "undefined" || errorsSent >= 5) return;
  errorsSent++;
  post({ error: { kind, message: message.slice(0, 500), stack: stack?.slice(0, 1500), path: location.pathname } });
}

let pageViewSent = false;
/** Once per page load (safe under React's development double effects). */
export function trackPageView() {
  if (pageViewSent) return;
  pageViewSent = true;
  track("page_view");
}

let installed = false;
export function installTelemetry() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => reportClientError("exception", e.message || "Script error", e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    reportClientError("unhandled_rejection", reason instanceof Error ? reason.message : String(reason), reason?.stack);
  });
  window.addEventListener("pagehide", flush);
  // Contact links anywhere on the page are tagged with data-track-contact.
  document.addEventListener("click", (e) => {
    const link = (e.target as Element | null)?.closest?.("[data-track-contact]");
    if (link) {
      track("contact_clicked", {
        channel: link.getAttribute("data-track-contact") ?? "",
        place: link.getAttribute("data-track-place") ?? "",
      });
    }
  });
}
