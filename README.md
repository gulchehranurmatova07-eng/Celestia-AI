# Celestia AI — by WEB-CREATORS

> **We Build Websites. You Grow Your Business.**
> *“Building Tomorrow’s Digital Success, Today.”*

Celestia AI is the official multilingual virtual assistant of **WEB-CREATORS**. It answers visitors' questions about the company, its website services and typical pricing, and helps them take the next step toward ordering a website.

## Features

- **Real AI answers.** Replies stream live from Claude through a secure server-side endpoint (`/api/chat`). The API key never reaches the browser.
- **Five languages.** English, Русский, 中文, O‘zbek and Türkçe. The whole interface is translated, and Celestia replies in the language the visitor writes in. The first message auto-detects the language, and the visitor can switch at any time from the header or the landing page. The choice is kept for the browser session.
- **Signature orb.** A floating glossy sphere with a rotating orbital ring, particles and a breathing glow. It has distinct idle, hover, thinking and "answer arrived" states and respects `prefers-reduced-motion`.
- **Verified knowledge base.** Company facts, services, pricing rules ($400 is an indicative average, never a fixed quote) and the official contact channels live in `lib/knowledge.ts` and `lib/config.ts`. The system prompt tells the model never to invent testimonials, projects, discounts, addresses or contact details, and to resist prompt injection.
- **Lead flow without pressure.** After a couple of answers, or when the visitor asks about price, a call-to-action appears with these options:
  - Discuss My Project (Gmail / Telegram)
  - Explore Services
  - Get a Price Estimate
  - View Portfolio
  - Ask Another Question
- **Privacy.** Nothing is stored server-side. Chats live only in the visitor's tab.
- **Chat UX:**
  - Streaming text
  - Copy buttons
  - Suggested follow-ups
  - Clear and minimize controls (Esc also minimizes)
  - Friendly error, rate-limit and retry states
  - A clear setup notice when no API key is configured
- **Mobile-first.** The chat is full-screen on phones with safe-area support and a floating panel on desktop.

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- Framer Motion
- Anthropic TypeScript SDK (`@anthropic-ai/sdk`), with Claude Opus 5.5 as the default model

## Run locally

```bash
npm install
cp .env.example .env.local     # then paste your key into ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Your Anthropic API key, from https://console.anthropic.com → *API Keys*. Server-only. Never prefix it with `NEXT_PUBLIC_`. |
| `CELESTIA_MODEL` | No | Claude model ID. Defaults to `claude-opus-5-5`. |
| `CELESTIA_RATE_LIMIT_PER_MINUTE` | No | Chat requests allowed per visitor IP per minute. Defaults to `12`. |
| `NEXT_PUBLIC_PORTFOLIO_URL` | No | Link for the **View Portfolio** button. Until it is set, the button shows a "coming soon" note. |

Without `ANTHROPIC_API_KEY`, the site still works and the chat shows a clear "AI is not connected yet" notice with the official contact links. It never fakes answers.

## Deploying online (Vercel — recommended)

1. Push this repository to GitHub (already done if you are reading this there).
2. Go to https://vercel.com/new and import the repository. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add `ANTHROPIC_API_KEY` (and any optional variables above).
4. Click **Deploy**. Your site will be live at `https://<project>.vercel.app`, and you can attach your own domain under *Settings → Domains*.

Any Node.js host works too (Render, Railway, a VPS, etc.): run `npm run build`, then `npm start` with the environment variables set. Node.js 20 or newer is required.

> **Rate limiting note:** the built-in limiter is in-memory, so it protects each server instance separately. On serverless or multi-instance hosting, also enable your platform's firewall / rate-limit rules (e.g. Vercel Firewall) for stronger abuse protection.

## Editing content

| What | Where |
|---|---|
| Company facts, services, pricing rules, assistant personality | `lib/knowledge.ts` |
| Contact email / Telegram, brand name, portfolio link | `lib/config.ts` |
| All interface text in the 5 languages | `lib/i18n.ts` |
| Colors, glass surfaces, orb animation | `app/globals.css` |
| Showcase images | `public/brand/` |

## Project structure

```
app/
  api/chat/route.ts   Secure streaming chat endpoint (validation, rate limit, errors)
  layout.tsx, page.tsx, globals.css, icon.svg
components/
  CelestiaApp.tsx     Shell: language state, launcher orb, chat panel animation
  Landing.tsx         Landing page sections
  ChatPanel.tsx       Chat UI (messages, CTA, follow-ups, composer)
  Orb.tsx             The Celestia orb
  LanguageSelector.tsx, Flag.tsx, RichText.tsx, Starfield.tsx, Icons.tsx
lib/
  knowledge.ts        System prompt + official knowledge base
  i18n.ts             Translations + language detection
  useChat.ts          Streaming chat hook
  chatProtocol.ts, rateLimit.ts, config.ts
```

---

**CELESTIA AI** · Your Digital Assistant by WEB-CREATORS
WEB-CREATORS was founded in 2026 by JackDaniel & DonAsadMoriarty.
Contact: webcreatorsjackdaniel@gmail.com · Telegram [@webcreators10](https://t.me/webcreators10)
