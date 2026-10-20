"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, type ChatTurn, type ErrorCode, type StreamEvent } from "./chatProtocol";
import type { LangCode } from "./i18n";
import { sessionId } from "./telemetry";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  error?: ErrorCode | "network";
  /** Server reference for support/diagnostics when a request fails. */
  requestId?: string;
};

let counter = 0;
const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Completed user/assistant pairs only, so the API always sees a clean alternating history. */
function toHistory(messages: UiMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const u = messages[i];
    const a = messages[i + 1];
    if (u.role === "user" && a.role === "assistant" && a.status === "done" && a.content.trim()) {
      turns.push({ role: "user", content: u.content }, { role: "assistant", content: a.content });
      i++;
    }
  }
  // Keep the most recent turns within the server's limit (leaving room for the new message).
  const max = MAX_HISTORY_MESSAGES - 1;
  return turns.length > max ? turns.slice(turns.length - (max - (max % 2))) : turns;
}

export function useChat(lang: LangCode) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [justAnswered, setJustAnswered] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((id: string, update: Partial<UiMessage> | ((m: UiMessage) => Partial<UiMessage>)) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...(typeof update === "function" ? update(m) : update) } : m)),
    );
  }, []);

  const run = useCallback(
    async (history: ChatTurn[], assistantId: string, langOverride?: LangCode) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setPending(true);

      const fail = (code: UiMessage["error"], requestId?: string) =>
        patch(assistantId, { status: "error", error: code, requestId });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Celestia-Session": sessionId() },
          body: JSON.stringify({ messages: history, lang: langOverride ?? langRef.current }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as { error?: ErrorCode; requestId?: string } | null;
          fail(data?.error ?? (res.status === 429 ? "rate_limited" : "server"), data?.requestId ?? res.headers.get("X-Request-Id") ?? undefined);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const event = JSON.parse(line) as StreamEvent;
            if (event.type === "delta") {
              patch(assistantId, (m) => ({ content: m.content + event.text }));
            } else if (event.type === "done") {
              finished = true;
              patch(assistantId, { status: "done" });
              setJustAnswered((n) => n + 1);
            } else if (event.type === "error") {
              finished = true;
              fail(event.code, event.requestId);
            }
          }
        }
        if (!finished) fail("network");
      } catch (err) {
        if (controller.signal.aborted) return;
        fail(err instanceof TypeError ? "network" : "server");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setPending(false);
        }
      }
    },
    [patch],
  );

  const send = useCallback(
    (raw: string, langOverride?: LangCode) => {
      const text = raw.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text || abortRef.current) return;
      const history = toHistory(messagesRef.current);
      const userMsg: UiMessage = { id: newId(), role: "user", content: text, status: "done" };
      const assistantMsg: UiMessage = { id: newId(), role: "assistant", content: "", status: "streaming" };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      void run([...history, { role: "user", content: text }], assistantMsg.id, langOverride);
    },
    [run],
  );

  /** Re-run the last failed answer. */
  const retry = useCallback(() => {
    if (abortRef.current) return;
    const all = messagesRef.current;
    const last = all[all.length - 1];
    const prevUser = all[all.length - 2];
    if (!last || last.role !== "assistant" || last.status !== "error" || prevUser?.role !== "user") return;
    const history = toHistory(all.slice(0, -2));
    patch(last.id, { status: "streaming", content: "", error: undefined, requestId: undefined });
    void run([...history, { role: "user", content: prevUser.content }], last.id);
  }, [patch, run]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
    setMessages([]);
  }, []);

  return { messages, pending, send, retry, clear, justAnswered };
}
