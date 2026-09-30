# Cashbook Feature Requirements

## Overview

The app supports two independent cashbooks backed by separate tabs in the same Google Spreadsheet (`GOOGLE_SHEET_ID`):

| Cashbook | Sheet Tab | Scope |
|----------|-----------|-------|
| Family | `Family` | Shared — all family members contribute |
| Personal | `Personal` | Individual — the signed-in user's own expenses |

Default view is **Family Book**.

## Sheet Schema

Both tabs share columns A–E; `Personal` has one extra column, **F = Tag**:

```
Family    (A:E)  Date | Name | Email | Reason | Amount
Personal  (A:F)  Date | Name | Email | Reason | Amount | Tag
```

- **Date**: `M/D/YYYY` format (e.g. `6/29/2026`) — written by the form, parsed client-side with `new Date()`
- **Name / Email**: from the signed-in Google account (NextAuth session)
- **Reason**: free-text description
- **Amount**: numeric, Bangladeshi Taka (৳)
- **Tag** (`Personal` only): free-text category, mandatory on new personal entries. Rows written before the feature shipped have an empty/absent column F and render as untagged — they are not backfilled.

## API Contract

### GET `/api/expenses?book=family|personal`

- `book=family` (default when missing or unknown) → reads `Family!A:E`
- `book=personal` → reads `Personal!A:F`
- Any unrecognised value falls back to `Family` (safe default)

### POST `/api/expenses`

Request body:
```json
{
  "userName": "string",
  "userEmail": "string",
  "reason": "string",
  "amount": 100,
  "date": "6/29/2026",
  "book": "family | personal",
  "tag": "string (personal only, required)"
}
```

- `book` is optional; defaults to `family` → writes to `Family!A:E` (no `tag`; it is ignored for family)
- `book=personal` → writes to `Personal!A:F`, with `tag` in column F

## Tab Mapping (Single Source of Truth)

`resolveTab()` in `app/api/expenses/route.ts` is the only place that maps a cashbook identifier to a sheet tab name:

```ts
function resolveTab(book: unknown): string {
  if (book === 'personal') return 'Personal';
  return 'Family';
}
```

Any future cashbook additions must go through this function — never construct tab names from user input directly.

## Date Field

- The expense form includes a date picker (HTML `<input type="date">`).
- Default value is today's date.
- The `max` attribute prevents selecting future dates.
- On submit, the `YYYY-MM-DD` value is converted to `M/D/YYYY` before sending to the API, preserving format consistency with existing data in the Family tab.
