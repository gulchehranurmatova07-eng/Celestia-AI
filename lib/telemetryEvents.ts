// Allowlisted anonymous analytics events and their permitted property values
// (an empty list means a short free-form string). Shared by client and server.
export const TELEMETRY_EVENTS = {
  page_view: {},
  chat_opened: { source: ["hero", "launcher", "nav", "question", "contact"] },
  chat_minimized: {},
  message_sent: { source: ["typed", "suggestion", "follow_up", "cta"] },
  language_changed: { to: ["en", "ru", "zh", "uz", "tr"], via: ["manual", "auto"] },
  cta_shown: {},
  cta_clicked: { cta: ["discuss", "explore", "estimate", "portfolio", "another"] },
  contact_clicked: { channel: ["email", "telegram", "phone", "instagram"], place: ["chat", "landing", "setup"] },
  chat_cleared: {},
  answer_copied: {},
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type TelemetryEventName = keyof typeof TELEMETRY_EVENTS;
