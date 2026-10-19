"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LANGS, LANG_META, type LangCode } from "@/lib/i18n";
import { Flag } from "./Flag";
import { ChevronDownIcon } from "./Icons";

/** Compact dropdown used in the chat header. */
export function LanguageSelector({
  value,
  onChange,
  label,
}: {
  value: LangCode;
  onChange: (lang: LangCode) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(LANGS.indexOf(value));
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setActive(LANGS.indexOf(value));
    listRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, value]);

  const choose = (lang: LangCode) => {
    onChange(lang);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${LANG_META[value].label}`}
        onClick={() => setOpen((o) => !o)}
        className="chip flex h-9 items-center gap-2 rounded-full pl-1.5 pr-2.5 text-sm text-ink"
      >
        <Flag lang={value} size={22} />
        <span className="hidden sm:inline">{LANG_META[value].label}</span>
        <span className="sm:hidden">{LANG_META[value].short}</span>
        <ChevronDownIcon size={15} className={`text-mist transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${LANGS[active]}`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % LANGS.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + LANGS.length) % LANGS.length);
            } else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              choose(LANGS[active]);
            } else if (e.key === "Escape" || e.key === "Tab") {
              e.stopPropagation();
              setOpen(false);
              buttonRef.current?.focus();
            }
          }}
          className="glass-strong absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-2xl p-1.5 shadow-2xl outline-none"
        >
          {LANGS.map((lang, i) => (
            <li
              key={lang}
              id={`${listId}-${lang}`}
              role="option"
              aria-selected={lang === value}
              onClick={() => choose(lang)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm ${
                i === active ? "bg-electric/20 text-white" : "text-ink/90"
              }`}
            >
              <Flag lang={lang} size={20} />
              <span className="flex-1">{LANG_META[lang].label}</span>
              {lang === value && <span className="h-1.5 w-1.5 rounded-full bg-cyan" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Row of language pills used on the landing page. */
export function LanguagePills({
  value,
  onChange,
  label,
}: {
  value: LangCode;
  onChange: (lang: LangCode) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {LANGS.map((lang) => {
        const selected = lang === value;
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(lang)}
            className={`flex h-10 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-sm transition-colors ${
              selected
                ? "border-cyan/60 bg-electric/20 text-white shadow-[0_0_24px_-6px_rgb(23_107_255/0.9)]"
                : "border-white/10 bg-white/[0.03] text-ink/80 hover:border-cyan/40 hover:text-white"
            }`}
          >
            <Flag lang={lang} size={26} />
            {LANG_META[lang].label}
          </button>
        );
      })}
    </div>
  );
}
