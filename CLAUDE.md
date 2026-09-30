# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **pnpm** for all commands (the repo has `pnpm-lock.yaml` / `pnpm-workspace.yaml`).

- `pnpm dev` — start the dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint (`eslint-config-next`, flat config in [eslint.config.mjs](eslint.config.mjs))
- `pnpm install` — install dependencies

There is no test runner configured.

## Architecture

Next.js 16 App Router + React 19 + Tailwind CSS v4, TypeScript strict mode. The `@/*` import alias maps to the repo root.

This app has **two independent authentication/Google identities** that must not be confused:

1. **NextAuth (user-facing login)** — [auth.ts](auth.ts) configures NextAuth v5 (beta) with **two providers**: Google, and a `Credentials` provider (`id: "email-code"`) for email one-time-code login. The handler is re-exported through [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts). Users sign in purely for identity; their name/email is attached to each expense. Client components read the session via `useSession()`, which requires the tree to be wrapped in [components/SessionProvider.tsx](components/SessionProvider.tsx) (done in [app/page.tsx](app/page.tsx)).

2. **Google Sheets service account (data store)** — [app/api/expenses/route.ts](app/api/expenses/route.ts) authenticates separately with `googleapis` using a service account (`GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY`) to read/write the spreadsheet `GOOGLE_SHEET_ID`. This is the backing database — there is no SQL/ORM. The signed-in user is **not** the identity used to access the sheet. Shared helper: [lib/sheets.ts](lib/sheets.ts).

### Authentication & the allowlist

- **One allowlist gates both login methods.** `ALLOWED_EMAILS` (env var, comma-separated `email` or `email:Display Name` entries) is the single source of truth in [lib/allowlist.ts](lib/allowlist.ts). The NextAuth `signIn` callback rejects any email not on it — for Google **and** email-code — so a random Google account cannot get in.
- **Email-code login (free, no DB):** [components/SignIn.tsx](components/SignIn.tsx) POSTs an email to [app/api/auth/otp/route.ts](app/api/auth/otp/request/route.ts), which (only for allowlisted emails) issues a 6-digit code and emails it via Gmail SMTP ([lib/mailer.ts](lib/mailer.ts)). The user submits the code through `signIn("email-code", …)`; the provider's `authorize` verifies it via [lib/otp.ts](lib/otp.ts). Codes are stored **HMAC-hashed** (keyed with `AUTH_SECRET`), single-use, 10-min expiry, capped at 5 verify attempts and 3 sends / 15-min. The request endpoint always responds generically (no user enumeration).
- **Server-derived identity:** the expenses/emergency API routes take `userName`/`userEmail` from `auth()` (the session), **never** from the request body, and reject unauthenticated or non-allowlisted callers (401/403) on both GET and POST. Forms no longer send identity fields — do not reintroduce them.

### Data flow

The spreadsheet is the single source of truth. Sheet columns are fixed and positional, and the two expense tabs differ in width:

- **`Family`** (`A:E`) — **Date | Name | Email | Reason | Amount**
- **`Personal`** (`A:F`) — **Date | Name | Email | Reason | Amount | Tag**

`resolveRange()` in [app/api/expenses/route.ts](app/api/expenses/route.ts) is the single place that maps a book to its range; `resolveTab()` still maps it to the tab name. Any change to this column order/shape must be mirrored in **both** the POST `values` array and the GET row-mapping in that route, and in the `Expense` interface in [components/ExpenseList.tsx](components/ExpenseList.tsx).

- **Write**: [components/ExpenseForm.tsx](components/ExpenseForm.tsx) POSTs `{ reason, amount, date, book }`, plus `tag` when `book === 'personal'`. Identity (`userName`/`userEmail`) is derived **server-side** from the session in the API route, not sent by the client; `date` is generated client-side as `en-US` locale (`M/D/YYYY`). The API appends a row.
- **Read**: [components/ExpenseList.tsx](components/ExpenseList.tsx) GETs all rows, then does all filtering/aggregation **client-side**: filters to the current calendar month, derives the user filter dropdown (keyed by email, disambiguating duplicate display names), and sums totals.
- **Refresh coupling**: [components/HomeContent.tsx](components/HomeContent.tsx) owns a `refreshTrigger` counter passed to `ExpenseList`; `ExpenseForm` calls `onExpenseAdded()` after a successful POST to bump it and force a re-fetch. Keep this wiring intact when adding mutations.

### Tags (personal entries only)

Personal expenses carry exactly one mandatory **tag**; family expenses have none and their form shows no tag field.

- **Vocabulary is derived, not stored separately.** There is no `Tags` tab and no `/api/tags` route. [components/ExpenseList.tsx](components/ExpenseList.tsx) derives the tag list from the rows it already fetched (`collectTags()` — trims, dedupes case-insensitively keeping first-seen casing) and reports it upward via `onTagsChange`; [components/HomeContent.tsx](components/HomeContent.tsx) holds it and passes it down to [components/ExpenseForm.tsx](components/ExpenseForm.tsx) as `existingTags`. This keeps the feature to a single Sheets read — do not add a second fetch. The `onTagsChange` callback must stay wrapped in `useCallback`, or the reporting effect loops.
- **The form** offers a `<select>` of existing tags plus a `+ Add new tag…` option that swaps in a free-text input. A newly typed tag that case-insensitively matches an existing one is snapped to the existing casing before POSTing.
- **Validation is duplicated client- and server-side**: non-empty, ≤ 40 chars, and **must not start with `=`, `+`, `-` or `@`** — rows are written with `valueInputOption: 'USER_ENTERED'`, so such a tag would be stored as a live spreadsheet formula. The server check is the authoritative one.
- **Historical rows are not backfilled.** Pre-tag rows are shorter than column F, so `row[5]` is `undefined` → `''`; they render as `—` and are reachable through the list's `Untagged` filter option.
- The personal list's desktop table gains a Tag column — its `tfoot` `colSpan` is `isPersonal ? 4 : 3`.

### Emergency Fund (third cashbook)

A third sheet tab **`Family-Emergency`** (`A:F`) stores family emergency fund entries with columns **Date | Name | Email | Reason | Amount | Type**, where `Type` is `cashin` (savings/contribution) or `cashout` (emergency spend). This tab must be created manually in the same Google Sheet.

- **API**: [app/api/emergency/route.ts](app/api/emergency/route.ts) — separate route (not the expenses route) because the column shape differs (`A:F` vs `A:E`). POST accepts `{ reason, amount, date, type }` (identity is server-derived from the session); GET returns all entries.
- **UI**: [components/EmergencyForm.tsx](components/EmergencyForm.tsx) + [components/EmergencyList.tsx](components/EmergencyList.tsx), rendered when the "Emergency Fund" tab is selected in [components/HomeContent.tsx](components/HomeContent.tsx).
- **Balance**: All-time Current Balance = Σ cash-in − Σ cash-out (shown in a summary card, never period-filtered). The two entry lists (cash-ins, cash-outs) each have a month/all period selector.
- The fund is **shared across all users** — no per-user filter.

### Conventions

- `date` strings are parsed with `new Date(...)` in several places; the write format (`en-US`) and the month-filter logic depend on each other — change them together.
- Amounts are Bangladeshi Taka (৳), formatted with `toLocaleString('en-IN')`.
- API error handling distinguishes config errors (missing env vars / key mismatch → 500, generic message) from input errors (→ 400, surfaced to the user).

## Environment variables

Required in `.env.local` (not committed):
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` — service account for the Sheets API. `GOOGLE_PRIVATE_KEY` has its literal `\n` sequences converted to newlines at runtime, so store it with escaped newlines.
- NextAuth Google OAuth credentials (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`) and `AUTH_SECRET` for the user login flow. `AUTH_SECRET` also keys the HMAC used to hash login codes.
- `ALLOWED_EMAILS` — comma-separated allowlist gating **all** logins, e.g. `alice@example.com:Alice,bob@example.com:Bob`. The optional `:Name` suffix sets the display name attributed to that user's expenses (for code login); without it a name is derived from the email.
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` — Gmail address + 16-char [App Password](https://myaccount.google.com/apppasswords) (needs 2FA on that account) used by [lib/mailer.ts](lib/mailer.ts) to send login codes over Gmail SMTP. Free (~500 emails/day); no third-party email service.

### Manual Google Sheet setup

The `Personal` tab's **Tag** column (F) needs no manual setup — Sheets already provides the column and the API writes into it.

Two tabs must be created by hand in the spreadsheet (in addition to `Family` / `Personal` / `Family-Emergency`):
- **`Login-Codes`** (`A:F`) — email one-time-code state: `Email | CodeHash | ExpiresAt | Attempts | WindowStart | SentCount`. Managed entirely by [lib/otp.ts](lib/otp.ts); no header row needed. Never contains plaintext codes.
