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
- **Privacy.** Conversation text is never stored. When a database is connected, only request metadata (timing, tokens, status) and anonymous usage events are recorded for the admin control center.
- **Chat UX:**
  - Streaming text
  - Copy buttons
  - Suggested follow-ups
  - Clear and minimize controls (Esc also minimizes)
  - Friendly error, rate-limit and retry states
  - A clear setup notice when no API key is configured
- **Mobile-first.** The chat is full-screen on phones with safe-area support and a floating panel on desktop.
- **Admin Control Center** at `/admin`. A private operations dashboard; see below.

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- Framer Motion
- Anthropic TypeScript SDK (`@anthropic-ai/sdk`), with Claude Opus 5.5 as the default model
- Postgres via `postgres` (admin control center only), tested with Vitest

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
| `DATABASE_URL` | For `/admin` | Postgres connection string. Tables are created automatically on first use. |
| `ADMIN_SETUP_TOKEN` | For first setup | A long random secret (24+ characters) used once at `/admin/setup` to create the Owner. Delete it afterwards. |
| `CRON_SECRET` | No | Enables the daily scheduled health check, alert evaluation and data retention (`vercel.json`). |
| `CELESTIA_MODEL` | No | Default Claude model ID (`claude-opus-5-5`). Admins can override it in Settings. |
| `CELESTIA_RATE_LIMIT_PER_MINUTE` | No | Default chat requests per visitor IP per minute (`12`). Admins can override it in Settings. |
| `NEXT_PUBLIC_PORTFOLIO_URL` | No | Link for the **View Portfolio** button. Until it is set, the button shows a "coming soon" note. |

Without `ANTHROPIC_API_KEY`, the site still works and the chat shows a clear "AI is not connected yet" notice with the official contact links. It never fakes answers.

## Deploying online (Vercel — recommended)

1. Push this repository to GitHub (already done if you are reading this there).
2. Go to https://vercel.com/new and import the repository. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add `ANTHROPIC_API_KEY` (and any optional variables above).
4. Click **Deploy**. Your site will be live at `https://<project>.vercel.app`, and you can attach your own domain under *Settings → Domains*.

Any Node.js host works too (Render, Railway, a VPS, etc.): run `npm run build`, then `npm start` with the environment variables set. Node.js 20 or newer is required.

> **Rate limiting note:** the built-in limiter is in-memory, so it protects each server instance separately. On serverless or multi-instance hosting, also enable your platform's firewall / rate-limit rules (e.g. Vercel Firewall) for stronger abuse protection.

## Admin Control Center (`/admin`)

A private operations dashboard for the WEB-CREATORS team. It uses the same Next.js app and the same deployment, and adds a Postgres database.

### What's inside

| Page | What it shows / does |
|---|---|
| **Overview** | Visitors, conversations, AI requests, success rate, failures, avg/p95 latency, tokens, estimated cost, system health. Also: request trend, live activity feed, model breakdown, open incidents and the current deployment. Ranges: 24h, 7d, 30d or custom (UTC). |
| **AI Operations** | Requests by model, success/failure/refusal trends, latency (avg, p50, p95, time to first token), failure categories, fallback-model answers and provider availability. Includes a request diagnostics table with filters and CSV export, plus a per-request detail page with a trace ID. |
| **Error Center** | Errors from the AI pipeline, backend, browser, auth and health checks, grouped by fingerprint. Each issue has a severity and a status (Open, Investigating, Resolved, Ignored), plus assignment, notes and history. Spike detection is built in. Resolved issues are verified against new evidence, and reopen automatically if they recur. Suggested causes are labelled as hypotheses. |
| **System Health** | Real checks of the app, database latency, the AI provider (authenticated Models API call) and configuration, with 24h uptime and failure history. |
| **Alerts** | Raised automatically for: provider/database down, error rate, p95 latency, error spikes, budget at 80%/100%, and spend spikes. You can acknowledge them, and they auto-resolve when the condition clears. |
| **Usage & Costs** | Daily tokens and estimated cost, cost by model, month-to-date and projection, monthly budget meter, spend-spike detection and the cost of failed requests. Estimates are always labelled as estimates. |
| **Product Analytics** | Anonymous funnel (visit → chat → message → answer → CTA → contact), plus languages, CTA and contact clicks, and event trends. |
| **Team & Roles** | Invite-only accounts. Roles: Owner, Administrator, Support, Read-only Analyst. You can change roles, suspend, reactivate, revoke sessions and create password-reset links. |
| **Settings** | AI model, effort, max tokens, maintenance mode, rate limit, budget and alert thresholds, data retention and the pricing table. It also shows which secrets are configured (never their values), keeps a change history with rollback, and lets you change your own password. |
| **Audit Log** | Append-only, hash-chained record of sign-ins and every privileged action, with an integrity check. |

### Setting it up on Vercel

1. In Vercel, open your project → **Storage** → create a free **Neon Postgres** database and connect it. This sets `DATABASE_URL`.
2. In **Settings → Environment Variables**, add `ADMIN_SETUP_TOKEN`, a long random secret. One way to make one: `openssl rand -base64 32`.
3. Optional: add `CRON_SECRET` (another random secret) for the daily scheduled checks.
4. Redeploy, open `https://<your-site>/admin/setup`, enter the setup token and create the **Owner** account.
5. Remove `ADMIN_SETUP_TOKEN` and redeploy. Invite other people from **Team & Roles**.

### Security model

- **Sessions.** scrypt-hashed passwords. Sessions use random tokens, stored only as SHA-256 hashes, in `HttpOnly`, `SameSite=Strict` cookies (`Secure` + `__Host-` prefix in production). Sessions have a 12h absolute lifetime and a 2h idle timeout.
- **Server-side checks.** Every admin page and API checks the session and the role's permission on the server, and denies by default. Nobody can change their own role or status, only Owners can create or modify Owners, and the last Owner can't be removed.
- **Request protection.** Writes require a same-origin `Origin` header (CSRF), inputs are validated on the server, and login is throttled (5 failures per 15 minutes per email or IP, enforced via the database so it works across serverless instances).
- **Confirmations.** Destructive or high-impact actions require confirmation, and data purge requires typing `PURGE`.
- **Secrets and logging.** Secrets stay in environment variables and are redacted from error logs. Conversation text is never stored.
- **Audit log.** Privileged actions are written to an audit log that the database refuses to update or delete, and that is hash-chained so tampering is detectable.

### Honest limitations

- **No visitor accounts.** The public site has no visitor accounts, so registration, login and per-user metrics (DAU or MAU by account, quotas per user) don't apply. "Visitors" are anonymous per-tab sessions, and returning-visitor retention isn't measurable by design.
- **Costs are estimates.** They come from recorded tokens × the pricing table. Confirmed charges are in the Claude Console; the Anthropic Usage & Cost Admin API isn't integrated.
- **Not integrated yet:**
  - Deployment history and build failures need a Vercel API token integration.
  - Email and Telegram alert notifications need a notification provider.
- **Rate limiting is per instance.** The chat rate limiter is in-memory; see the note above.

## Tests

```bash
npm run typecheck
npm test                                        # unit tests
TEST_DATABASE_URL=postgres://… npm test         # + integration tests against a disposable Postgres
```

The integration tests cover:

- Owner bootstrap, plus login, lockout and logout
- Invite-only onboarding, role permissions and no self-elevation
- CSRF rejection, suspension and settings validation/rollback
- Chat request recording (with a mock AI)
- Billing-error handling and metric calculations against raw rows
- Telemetry allowlisting and audit-log tamper detection

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
  admin/              Control-center UI (shell, charts, controls, forms)
app/admin/            Admin pages (login, setup, invite, and the (panel) group)
app/api/admin/        Admin APIs (auth, team, settings, errors, alerts, health, export, cron…)
app/api/telemetry/    Anonymous analytics + frontend error intake
lib/
  knowledge.ts        System prompt + official knowledge base
  i18n.ts             Translations + language detection
  useChat.ts          Streaming chat hook
  telemetry.ts        Client-side anonymous event tracking
  roles.ts            Role → permission matrix
  settingsSchema.ts   Admin settings, validation, pricing table
  server/             DB, migrations, auth, audit, errors, metrics, health, alerts, retention
  chatProtocol.ts, rateLimit.ts, config.ts
tests/                Vitest unit + integration tests
```

---

**CELESTIA AI** · Your Digital Assistant by WEB-CREATORS
WEB-CREATORS was founded in 2026 by JackDaniel & DonAsadMoriarty.
Contact: webcreatorsjackdaniel@gmail.com · Telegram [@webcreators10](https://t.me/webcreators10)
