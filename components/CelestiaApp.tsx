"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LANG, DICTIONARIES, LANG_META, detectLanguage, isLang, type LangCode } from "@/lib/i18n";
import { useChat } from "@/lib/useChat";
import { ChatPanel, type ChatPanelHandle } from "./ChatPanel";
import { Landing } from "./Landing";
import { Orb, type OrbState } from "./Orb";
import { Starfield } from "./Starfield";

const LANG_KEY = "celestia-lang";

export function CelestiaApp() {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<ChatPanelHandle>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const chat = useChat(lang);
  const reduceMotion = useReducedMotion();
  const t = DICTIONARIES[lang];

  // Restore the language chosen earlier in this browser session.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LANG_KEY);
      if (isLang(saved)) setLangState(saved);
    } catch {
      // Storage unavailable (private mode, blocked cookies) — keep the default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = LANG_META[lang].htmlLang;
  }, [lang]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try {
      sessionStorage.setItem(LANG_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      // Follow the visitor's language on their first message when it is clear.
      if (!chat.messages.some((m) => m.role === "user")) {
        const detected = detectLanguage(text);
        if (detected && detected !== lang) setLang(detected);
      }
      chat.send(text);
    },
    [chat, lang, setLang],
  );

  const openChat = useCallback(() => {
    setOpen(true);
    setTimeout(() => panelRef.current?.focusInput(), reduceMotion ? 0 : 320);
  }, [reduceMotion]);

  const ask = useCallback(
    (question: string) => {
      openChat();
      if (!chat.pending) send(question);
    },
    [openChat, send, chat.pending],
  );

  const minimize = useCallback(() => {
    setOpen(false);
    setTimeout(() => launcherRef.current?.focus(), 50);
  }, []);

  const launcherState: OrbState = chat.pending ? "thinking" : "idle";

  return (
    <>
      <Starfield />

      <Landing t={t} lang={lang} onLangChange={setLang} onStart={openChat} onAsk={ask} chatOpen={open} />

      {/* Floating launcher */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 sm:bottom-7 sm:right-7"
          >
            <button
              ref={launcherRef}
              type="button"
              onClick={openChat}
              aria-label={t.openChat}
              className="orb-interactive group relative block rounded-full"
            >
              <Orb size="clamp(56px, 15vw, 68px)" state={launcherState} showStar={false} />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-1/2 right-full mr-5 translate-y-1/2 whitespace-nowrap rounded-full border border-cyan/30 bg-abyss/95 px-3.5 py-1.5 text-xs text-ink opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {t.orbTooltip}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel — kept mounted so the conversation survives minimizing */}
      <motion.div
        initial={false}
        animate={
          open
            ? { opacity: 1, scale: 1, y: 0, pointerEvents: "auto" }
            : { opacity: 0, scale: reduceMotion ? 1 : 0.86, y: reduceMotion ? 0 : 40, pointerEvents: "none" }
        }
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26, mass: 0.9 }}
        style={{ transformOrigin: "bottom right", visibility: open ? "visible" : "hidden" }}
        aria-hidden={!open}
        className="fixed inset-0 z-50 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(740px,calc(100dvh-48px))] sm:w-[420px]"
      >
        <ChatPanel ref={panelRef} lang={lang} t={t} onLangChange={setLang} onMinimize={minimize} chat={chat} onSend={send} />
      </motion.div>
    </>
  );
}
