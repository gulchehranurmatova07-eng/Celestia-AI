"use client";

import Image from "next/image";
import { CONTACT } from "@/lib/config";
import type { Dictionary, LangCode } from "@/lib/i18n";
import {
  ArrowRightIcon,
  BoltIcon,
  BriefcaseIcon,
  CartIcon,
  GlobeIcon,
  LayoutIcon,
  MailIcon,
  MonitorIcon,
  PhoneIcon,
  ShieldIcon,
  SmileIcon,
  SparkleIcon,
  StarIcon,
  CallIcon,
  InstagramIcon,
  TelegramIcon,
  WrenchIcon,
} from "./Icons";
import { LanguagePills } from "./LanguageSelector";
import { Orb } from "./Orb";

const FEATURE_ICONS = [BoltIcon, GlobeIcon, SmileIcon, StarIcon];
const SERVICE_ICONS = [MonitorIcon, PhoneIcon, ShieldIcon, LayoutIcon, CartIcon, WrenchIcon, BriefcaseIcon];
const SHOWCASE = ["/brand/showcase-assistant.jpg", "/brand/showcase-orb.jpg", "/brand/showcase-chat.jpg"];

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-11 w-12 place-items-center">
        <Orb size={compact ? 28 : 32} showStar={false} className="[&_.orb-float]:animate-none" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-[15px] font-bold tracking-[0.14em]">
          CELESTIA <span className="text-gradient">AI</span>
        </span>
        <span className="mt-1 block text-[10px] tracking-[0.2em] text-mist">BY WEB-CREATORS</span>
      </span>
    </span>
  );
}

export function Landing({
  t,
  lang,
  onLangChange,
  onStart,
  onAsk,
  chatOpen,
}: {
  t: Dictionary;
  lang: LangCode;
  onLangChange: (lang: LangCode) => void;
  onStart: (source?: "hero" | "nav" | "contact") => void;
  onAsk: (question: string) => void;
  chatOpen: boolean;
}) {
  return (
    <div className="relative isolate overflow-x-clip">
      <div className="horizon pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]" />

      {/* Navigation */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <a href="#top" aria-label="Celestia AI — home">
          <Wordmark />
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-7 text-sm text-mist md:flex">
          <a href="#services" className="transition-colors hover:text-white">
            {t.navServices}
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            {t.navPricing}
          </a>
          <a href="#contact" className="transition-colors hover:text-white">
            {t.navContact}
          </a>
        </nav>
        <button type="button" onClick={() => onStart("nav")} className="btn-primary hidden rounded-full px-4 py-2 text-sm font-medium text-white sm:block">
          {t.startConversation}
        </button>
      </header>

      <main id="top">
        {/* Hero */}
        <div className="relative">
        <div className="planet-horizon" aria-hidden="true" />
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:pb-24 md:pt-14">
          <div className="order-2 md:order-1">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-xs text-mist">
              <SparkleIcon size={12} className="text-cyan" />
              WEB-CREATORS · {t.tagline}
            </p>
            <h1 className="font-display text-[2.4rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              {t.heroTitleA} <span className="text-gradient">{t.heroTitleB}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mist">{t.heroText}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onStart("hero")}
                className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-medium text-white"
              >
                {t.startConversation}
                <ArrowRightIcon size={18} />
              </button>
            </div>

            <div className="mt-9">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-mist/80">{t.chooseLanguage}</p>
              <LanguagePills value={lang} onChange={onLangChange} label={t.chooseLanguage} />
            </div>

            <div className="mt-8">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-mist/80">{t.popularQuestions}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {t.suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onAsk(q)}
                    className="chip group inline-flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-left text-sm text-ink/90"
                  >
                    {q}
                    <ArrowRightIcon size={15} className="text-cyan transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 flex justify-center md:order-2">
            <div className="relative grid place-items-center py-10 md:py-0">
              <div className="absolute h-[340px] w-[340px] rounded-full border border-electric/10 sm:h-[400px] sm:w-[400px]" />
              <div className="absolute h-[250px] w-[250px] rounded-full border border-cyan/10 sm:h-[290px] sm:w-[290px]" />
              <button
                type="button"
                onClick={() => onStart("hero")}
                aria-label={t.openChat}
                aria-expanded={chatOpen}
                className="orb-interactive group relative rounded-full focus-visible:outline-offset-[18px]"
              >
                <Orb size="clamp(120px, 34vw, 170px)" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full mt-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan/30 bg-abyss/90 px-3.5 py-1.5 text-xs text-ink opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {t.orbTooltip}
                </span>
              </button>
            </div>
          </div>
        </section>
        </div>

        {/* Features */}
        <section aria-label="Features" className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="glass grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-line md:grid-cols-4">
            {t.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={f.title} className="bg-[rgb(6_11_22/0.92)] p-5 sm:p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-cyan/30 bg-electric/10 text-cyan shadow-[0_0_24px_-6px_rgb(23_107_255/0.9)]">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 font-display font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Services + pricing */}
        <section id="services" className="mx-auto max-w-6xl scroll-mt-8 px-4 pt-24 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t.servicesTitle}</h2>
            <p className="mt-3 text-mist">{t.servicesText}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.services.map((s, i) => {
              const Icon = SERVICE_ICONS[i] ?? SparkleIcon;
              return (
                <div key={s.title} className="glass group rounded-3xl p-5 transition-colors hover:border-cyan/35">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white/[0.03] text-cyan transition-colors group-hover:border-cyan/40">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-4 font-display font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist">{s.text}</p>
                </div>
              );
            })}

            <div id="pricing" className="relative scroll-mt-8 overflow-hidden rounded-3xl border border-cyan/30 bg-gradient-to-br from-electric/25 via-[rgb(10_20_44/0.9)] to-[rgb(6_11_22/0.95)] p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-electric/30 blur-3xl" />
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan">{t.pricingTitle}</p>
              <p className="mt-3 text-sm text-mist">{t.pricingText}</p>
              <p className="mt-1 font-display text-5xl font-bold text-white">$200</p>
              <p className="mt-3 text-xs leading-relaxed text-mist">{t.pricingNote}</p>
              <button type="button" onClick={() => onAsk(t.estimateMessage)} className="btn-primary mt-4 rounded-full px-4 py-2 text-sm font-medium text-white">
                {t.askPrice}
              </button>
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section aria-labelledby="showcase-title" className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <div className="max-w-2xl">
            <h2 id="showcase-title" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t.showcaseTitle}
            </h2>
            <p className="mt-3 text-mist">{t.showcaseText}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {SHOWCASE.map((src, i) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-3xl border border-line bg-abyss"
              >
                <Image
                  src={src}
                  alt={t.showcaseAlts[i]}
                  width={1254}
                  height={1254}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="aspect-square h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 transition-shadow group-hover:shadow-[inset_0_0_0_1px_rgb(54_217_255/0.35)]" />
              </a>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-24 sm:px-6">
          <div className="glass relative overflow-hidden rounded-[32px] px-6 py-12 text-center sm:px-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[70%] -translate-x-1/2 rounded-full bg-electric/25 blur-3xl" />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">{t.contactTitle}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-mist">{t.contactText}</p>
            <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a href={`mailto:${CONTACT.email}`} data-track-contact="email" data-track-place="landing" className="chip inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3.5">
                <MailIcon className="text-cyan" />
                <span className="text-left">
                  <span className="block text-[11px] text-mist">{t.emailUs}</span>
                  <span className="block break-all text-sm">{CONTACT.email}</span>
                </span>
              </a>
              <a
                href={CONTACT.telegramUrl}
                data-track-contact="telegram"
                data-track-place="landing"
                target="_blank"
                rel="noopener noreferrer"
                className="chip inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3.5"
              >
                <TelegramIcon className="text-cyan" />
                <span className="text-left">
                  <span className="block text-[11px] text-mist">{t.telegramUs}</span>
                  <span className="block text-sm">@{CONTACT.telegramHandle}</span>
                </span>
              </a>
              <a href={CONTACT.phoneHref} data-track-contact="phone" data-track-place="landing" className="chip inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3.5">
                <CallIcon className="text-cyan" />
                <span className="text-left">
                  <span className="block text-[11px] text-mist">{t.callUs}</span>
                  <span className="block text-sm">{CONTACT.phone}</span>
                </span>
              </a>
              <a
                href={CONTACT.instagramUrl}
                data-track-contact="instagram"
                data-track-place="landing"
                target="_blank"
                rel="noopener noreferrer"
                className="chip inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3.5"
              >
                <InstagramIcon className="text-cyan" />
                <span className="text-left">
                  <span className="block text-[11px] text-mist">{t.instagramUs}</span>
                  <span className="block text-sm">@{CONTACT.instagramHandle}</span>
                </span>
              </a>
              <button type="button" onClick={() => onStart("contact")} className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-medium text-white">
                {t.startConversation}
                <ArrowRightIcon size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 pb-28 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Wordmark compact />
            <p className="mt-4 text-sm text-ink/90">{t.tagline}</p>
            <p className="mt-1 font-display text-sm italic text-cyan/90">“{t.motto}”</p>
          </div>
          <div className="text-sm text-mist md:text-right">
            <p>{t.founded}</p>
            <p className="mt-1">
              © {new Date().getFullYear()} WEB-CREATORS. {t.rights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
