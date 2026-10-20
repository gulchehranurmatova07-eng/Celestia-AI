"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { forwardRef, type ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { CONTACT, PORTFOLIO_URL } from "@/lib/config";
import { MAX_MESSAGE_CHARS } from "@/lib/chatProtocol";
import type { Dictionary, LangCode } from "@/lib/i18n";
import { track } from "@/lib/telemetry";
import type { UiMessage, useChat } from "@/lib/useChat";
import {
  CheckIcon,
  CopyIcon,
  ExternalIcon,
  MailIcon,
  MinusIcon,
  RetryIcon,
  SendIcon,
  TelegramIcon,
  TrashIcon,
} from "./Icons";
import { LanguageSelector } from "./LanguageSelector";
import { Orb, type OrbState } from "./Orb";
import { RichText } from "./RichText";

const PRICE_INTENT = /price|cost|quote|budget|estimate|стоим|цен|бюджет|价格|多少钱|报价|预算|narx|qancha|byudjet|fiyat|ücret|bütçe|teklif/i;

export type ChatPanelHandle = { focusInput: () => void };

type Props = {
  lang: LangCode;
  t: Dictionary;
  onLangChange: (lang: LangCode) => void;
  onMinimize: () => void;
  chat: ReturnType<typeof useChat>;
  onSend: (text: string) => void;
};

export const ChatPanel = forwardRef<ChatPanelHandle, Props>(function ChatPanel(
  { lang, t, onLangChange, onMinimize, chat, onSend },
  ref,
) {
  const { messages, pending, retry, clear, justAnswered } = chat;
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [ctaHidden, setCtaHidden] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [portfolioNote, setPortfolioNote] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const reduceMotion = useReducedMotion();

  useImperativeHandle(ref, () => ({ focusInput: () => inputRef.current?.focus() }), []);

  // Orb: thinking while waiting, a single pulse when an answer lands.
  useEffect(() => {
    if (pending) {
      setOrbState("thinking");
      return;
    }
    if (justAnswered === 0) {
      setOrbState("idle");
      return;
    }
    setOrbState("responded");
    const id = setTimeout(() => setOrbState("idle"), 800);
    return () => clearTimeout(id);
  }, [pending, justAnswered]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, pending, contactOpen, portfolioNote, reduceMotion]);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const answered = messages.filter((m) => m.role === "assistant" && m.status === "done").length;
  const last = messages[messages.length - 1];
  const showCta =
    !pending &&
    !ctaHidden &&
    last?.role === "assistant" &&
    last.status === "done" &&
    (answered >= 2 || messages.some((m) => m.role === "user" && PRICE_INTENT.test(m.content)));

  const ctaTracked = useRef(false);
  useEffect(() => {
    if (showCta && !ctaTracked.current) {
      ctaTracked.current = true;
      track("cta_shown");
    }
  }, [showCta]);

  const followUps = useMemo(() => {
    const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content.toLowerCase()));
    const pool = t.followUps.filter((q) => !asked.has(q.toLowerCase()));
    const start = (answered * 2) % Math.max(pool.length, 1);
    return [...pool.slice(start), ...pool.slice(0, start)].slice(0, 3);
  }, [messages, t.followUps, answered]);

  const submit = (text: string, source: "typed" | "suggestion" | "follow_up" | "cta" = "typed") => {
    if (!text.trim() || pending) return;
    track("message_sent", { source });
    stickToBottom.current = true;
    setContactOpen(false);
    setPortfolioNote(false);
    setCtaHidden(false);
    onSend(text);
    setInput("");
  };

  const onClear = () => {
    track("chat_cleared");
    clear();
    setCtaHidden(false);
    setContactOpen(false);
    setPortfolioNote(false);
    inputRef.current?.focus();
  };

  const errorText = (m: UiMessage) => {
    switch (m.error) {
      case "network":
        return t.errNetwork;
      case "rate_limited":
        return t.errRateLimit;
      case "too_long":
        return t.errTooLong;
      case "refused":
        return t.errRefused;
      case "maintenance":
        return t.errMaintenance;
      default:
        return t.errServer;
    }
  };

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Website project — WEB-CREATORS")}`;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Celestia AI"
      onKeyDown={(e) => {
        if (e.key === "Escape") onMinimize();
      }}
      className="glass-strong panel-glow flex h-full w-full flex-col overflow-hidden max-sm:bg-[#050914] sm:rounded-[28px]"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
        <div className="relative grid h-12 w-12 flex-none place-items-center">
          <Orb size={38} state={orbState} showStar={false} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] font-semibold leading-tight tracking-tight">
            Celestia <span className="text-gradient">AI</span>
          </h2>
          <p className="flex items-center gap-1.5 truncate text-xs text-mist">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153/0.9)]" />
            {t.online}
          </p>
        </div>
        <LanguageSelector value={lang} onChange={onLangChange} label={t.language} />
        <button
          type="button"
          onClick={onClear}
          disabled={messages.length === 0}
          aria-label={t.clear}
          title={t.clear}
          className="grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <TrashIcon size={18} />
        </button>
        <button
          type="button"
          onClick={onMinimize}
          aria-label={t.minimize}
          title={t.minimize}
          className="grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-white"
        >
          <MinusIcon size={20} />
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="scrollbar-thin flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5"
        aria-live="polite"
        aria-busy={pending}
      >
        <AssistantBubble>
          <RichText text={t.welcome} />
        </AssistantBubble>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-11">
            {t.suggestions.map((q) => (
              <button key={q} type="button" onClick={() => submit(q, "suggestion")} className="chip rounded-full px-3.5 py-2 text-left text-[13px] text-ink/90">
                {q}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={m.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {m.role === "user" ? (
                <UserBubble text={m.content} label={t.you} />
              ) : m.status === "error" ? (
                <AssistantBubble>
                  {m.content && (
                    <div className="mb-3 opacity-70">
                      <RichText text={m.content} />
                    </div>
                  )}
                  {m.error === "not_configured" ? (
                    <SetupNotice t={t} mailto={mailto} />
                  ) : m.error === "maintenance" ? (
                    <div>
                      <p>{t.errMaintenance}</p>
                      <ContactLinks t={{ ...t, discussText: "" }} mailto={mailto} className="mt-2" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[#ffb4b4]">{errorText(m)}</p>
                      {m.requestId && (
                        <p className="w-full text-[11px] text-mist/70">
                          {t.errReference}: <span className="font-mono">{m.requestId.slice(0, 8)}</span>
                        </p>
                      )}
                      {i === messages.length - 1 && m.error !== "refused" && (
                        <button
                          type="button"
                          onClick={retry}
                          disabled={pending}
                          className="chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-ink"
                        >
                          <RetryIcon size={14} /> {t.retry}
                        </button>
                      )}
                    </div>
                  )}
                </AssistantBubble>
              ) : m.content === "" ? (
                <ThinkingBubble label={t.thinking} />
              ) : (
                <AssistantBubble copyText={m.status === "done" ? m.content : undefined} t={t}>
                  <div className={m.status === "streaming" && !reduceMotion ? "caret-host" : ""}>
                    <RichText text={m.content} />
                  </div>
                </AssistantBubble>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {showCta && (
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-11 rounded-2xl border border-cyan/25 bg-gradient-to-br from-electric/20 via-electric/5 to-transparent p-4"
            aria-label={t.ctaTitle}
          >
            <p className="font-display font-semibold">{t.ctaTitle}</p>
            <p className="mt-0.5 text-sm text-mist">{t.ctaText}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!contactOpen) track("cta_clicked", { cta: "discuss" });
                  setContactOpen((o) => !o);
                }}
                aria-expanded={contactOpen}
                className="btn-primary rounded-full px-3.5 py-2 text-[13px] font-medium text-white"
              >
                {t.ctaDiscuss}
              </button>
              <button
                type="button"
                onClick={() => {
                  track("cta_clicked", { cta: "explore" });
                  submit(t.exploreMessage, "cta");
                }}
                className="chip rounded-full px-3.5 py-2 text-[13px]">
                {t.ctaExplore}
              </button>
              <button
                type="button"
                onClick={() => {
                  track("cta_clicked", { cta: "estimate" });
                  submit(t.estimateMessage, "cta");
                }}
                className="chip rounded-full px-3.5 py-2 text-[13px]">
                {t.ctaEstimate}
              </button>
              {PORTFOLIO_URL ? (
                <a
                  href={PORTFOLIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px]"
                >
                  {t.ctaPortfolio} <ExternalIcon size={13} />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!portfolioNote) track("cta_clicked", { cta: "portfolio" });
                    setPortfolioNote((o) => !o);
                  }}
                  aria-expanded={portfolioNote}
                  className="chip rounded-full px-3.5 py-2 text-[13px]"
                >
                  {t.ctaPortfolio}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  track("cta_clicked", { cta: "another" });
                  setCtaHidden(true);
                  inputRef.current?.focus();
                }}
                className="chip rounded-full px-3.5 py-2 text-[13px]"
              >
                {t.ctaAnother}
              </button>
            </div>

            {contactOpen && <ContactLinks t={t} mailto={mailto} className="mt-3" />}
            {portfolioNote && !PORTFOLIO_URL && <p className="mt-3 text-sm text-mist">{t.portfolioSoon}</p>}
          </motion.section>
        )}

        {!pending && last?.role === "assistant" && last.status === "done" && followUps.length > 0 && (
          <div className="pl-11">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-mist/80">{t.followUpTitle}</p>
            <div className="flex flex-wrap gap-2">
              {followUps.map((q) => (
                <button key={q} type="button" onClick={() => submit(q, "follow_up")} className="chip rounded-full px-3 py-1.5 text-left text-[13px] text-ink/90">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-line px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 pl-4 transition-colors focus-within:border-cyan/50">
          <label htmlFor="celestia-input" className="sr-only">
            {t.placeholder}
          </label>
          <textarea
            id="celestia-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={t.placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(input);
              }
            }}
            className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-ink placeholder:text-mist/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            aria-label={t.send}
            className="btn-primary grid h-10 w-10 flex-none place-items-center rounded-xl text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3 px-1">
          <p className="text-[11px] leading-snug text-mist/70">{t.disclaimer}</p>
          {input.length > MAX_MESSAGE_CHARS - 300 && (
            <span className="flex-none text-[11px] tabular-nums text-mist">
              {input.length}/{MAX_MESSAGE_CHARS}
            </span>
          )}
        </div>
      </form>
    </div>
  );
});

function Avatar() {
  return (
    <div className="grid h-8 w-8 flex-none place-items-center">
      <Orb size={26} showStar={false} className="[&_.orb-float]:animate-none" />
    </div>
  );
}

function AssistantBubble({ children, copyText, t }: { children: ReactNode; copyText?: string; t?: Dictionary }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-3">
      <Avatar />
      <div className="group min-w-0 max-w-[88%]">
        <div className="rounded-2xl rounded-tl-md border border-line bg-[rgb(14_24_48/0.75)] px-4 py-3 text-[14.5px] leading-relaxed text-ink/95">
          {children}
        </div>
        {copyText && t && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(copyText);
                track("answer_copied");
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              } catch {
                // Clipboard unavailable (insecure context or permission denied).
              }
            }}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] text-mist transition-colors hover:text-white"
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? t.copied : t.copy}
          </button>
        )}
      </div>
    </div>
  );
}

function UserBubble({ text, label }: { text: string; label: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-gradient-to-br from-[#2a7bff] to-[#1257e0] px-4 py-2.5 text-[14.5px] leading-relaxed text-white shadow-[0_8px_24px_-10px_rgb(23_107_255/0.9)]">
        <span className="sr-only">{label}: </span>
        {text}
      </div>
    </div>
  );
}

function ThinkingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar />
      <div
        role="status"
        aria-label={label}
        className="flex h-[46px] items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-[rgb(14_24_48/0.75)] px-4"
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function ContactLinks({ t, mailto, className = "" }: { t: Dictionary; mailto: string; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {t.discussText && <p className="text-sm text-mist">{t.discussText}</p>}
      <div className="flex flex-col gap-2">
        <a href={mailto} data-track-contact="email" data-track-place="chat" className="chip flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm">
          <MailIcon size={18} className="text-cyan" />
          <span className="min-w-0">
            <span className="block text-[11px] text-mist">{t.emailUs}</span>
            <span className="block truncate">{CONTACT.email}</span>
          </span>
        </a>
        <a href={CONTACT.telegramUrl} data-track-contact="telegram" data-track-place="chat" target="_blank" rel="noopener noreferrer" className="chip flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm">
          <TelegramIcon size={18} className="text-cyan" />
          <span>
            <span className="block text-[11px] text-mist">{t.telegramUs}</span>
            <span className="block">@{CONTACT.telegramHandle}</span>
          </span>
        </a>
      </div>
    </div>
  );
}

function SetupNotice({ t, mailto }: { t: Dictionary; mailto: string }) {
  return (
    <div>
      <p className="font-semibold text-white">{t.errNotConfiguredTitle}</p>
      <p className="mt-1 text-sm text-mist">{t.errNotConfiguredText}</p>
      <ContactLinks t={{ ...t, discussText: "" }} mailto={mailto} className="mt-2" />
    </div>
  );
}
