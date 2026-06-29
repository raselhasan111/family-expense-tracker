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

1. **NextAuth (user-facing login)** — [auth.ts](auth.ts) configures NextAuth v5 (beta) with the Google provider. The handler is re-exported through [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts). Users sign in with their own Google account purely for identity; their name/email is attached to each expense. Client components read the session via `useSession()`, which requires the tree to be wrapped in [components/SessionProvider.tsx](components/SessionProvider.tsx) (done in [app/page.tsx](app/page.tsx)).

2. **Google Sheets service account (data store)** — [app/api/expenses/route.ts](app/api/expenses/route.ts) authenticates separately with `googleapis` using a service account (`GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY`) to read/write the spreadsheet `GOOGLE_SHEET_ID`. This is the backing database — there is no SQL/ORM. The signed-in user is **not** the identity used to access the sheet.

### Data flow

The spreadsheet is the single source of truth. Sheet columns are fixed and positional: **Date | Name | Email | Reason | Amount** (`Sheet1!A:E`). Any change to this column order/shape must be mirrored in **both** the POST `values` array and the GET row-mapping in [app/api/expenses/route.ts](app/api/expenses/route.ts), and in the `Expense` interface in [components/ExpenseList.tsx](components/ExpenseList.tsx).

- **Write**: [components/ExpenseForm.tsx](components/ExpenseForm.tsx) POSTs `{ userName, userEmail, reason, amount, date }`. `userName`/`userEmail` come from the NextAuth session; `date` is generated client-side as `en-US` locale (`M/D/YYYY`). The API appends a row.
- **Read**: [components/ExpenseList.tsx](components/ExpenseList.tsx) GETs all rows, then does all filtering/aggregation **client-side**: filters to the current calendar month, derives the user filter dropdown (keyed by email, disambiguating duplicate display names), and sums totals.
- **Refresh coupling**: [components/HomeContent.tsx](components/HomeContent.tsx) owns a `refreshTrigger` counter passed to `ExpenseList`; `ExpenseForm` calls `onExpenseAdded()` after a successful POST to bump it and force a re-fetch. Keep this wiring intact when adding mutations.

### Conventions

- `date` strings are parsed with `new Date(...)` in several places; the write format (`en-US`) and the month-filter logic depend on each other — change them together.
- Amounts are Bangladeshi Taka (৳), formatted with `toLocaleString('en-IN')`.
- API error handling distinguishes config errors (missing env vars / key mismatch → 500, generic message) from input errors (→ 400, surfaced to the user).

## Environment variables

Required in `.env.local` (not committed):
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` — service account for the Sheets API. `GOOGLE_PRIVATE_KEY` has its literal `\n` sequences converted to newlines at runtime, so store it with escaped newlines.
- NextAuth Google OAuth credentials (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`) and `AUTH_SECRET` for the user login flow.
