import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { getSheetsClient, spreadsheetId } from "@/lib/sheets";

// One-time email login codes, stored in the `Login-Codes` sheet tab so the server
// can enforce single-use, expiry, attempt caps and resend throttling without a
// database. Codes are never stored in plaintext — only an HMAC keyed with
// AUTH_SECRET, so the sheet alone cannot be brute-forced back to a code.
//
// Tab `Login-Codes` columns (A:F), no header row required:
//   Email | CodeHash | ExpiresAt(ms) | Attempts | WindowStart(ms) | SentCount
//
// This tab must be created manually in the same Google Sheet.

const TAB = "Login-Codes";
const RANGE = `${TAB}!A:F`;

const CODE_TTL_MS = 10 * 60 * 1000; // codes expire after 10 minutes
const MAX_VERIFY_ATTEMPTS = 5; // wrong-code guesses allowed per issued code
const RESEND_WINDOW_MS = 15 * 60 * 1000; // throttling window
const MAX_SENDS_PER_WINDOW = 3; // codes emailed per address per window

function hashCode(email: string, code: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing required environment variables: AUTH_SECRET");
  // Bind the hash to the email so a hash cannot be replayed for another address.
  return createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

interface Row {
  rowNumber: number; // 1-based sheet row for range addressing
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  windowStart: number;
  sentCount: number;
}

async function readRows(): Promise<Row[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: RANGE,
  });
  const values = res.data.values ?? [];
  return values
    .map((row, index) => ({
      rowNumber: index + 1,
      email: String(row[0] ?? "").toLowerCase(),
      codeHash: String(row[1] ?? ""),
      expiresAt: Number(row[2] ?? 0),
      attempts: Number(row[3] ?? 0),
      windowStart: Number(row[4] ?? 0),
      sentCount: Number(row[5] ?? 0),
    }))
    .filter((r) => r.email && r.email !== "email"); // skip blanks / optional header
}

function findRow(rows: Row[], email: string): Row | undefined {
  const target = email.toLowerCase();
  return rows.find((r) => r.email === target);
}

async function writeRow(row: Row): Promise<void> {
  const sheets = getSheetsClient();
  const values = [[
    row.email,
    row.codeHash,
    String(row.expiresAt),
    String(row.attempts),
    String(row.windowStart),
    String(row.sentCount),
  ]];
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${TAB}!A${row.rowNumber}:F${row.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

async function appendRow(values: (string | number)[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: RANGE,
    valueInputOption: "RAW",
    requestBody: { values: [values.map(String)] },
  });
}

/**
 * Generate and persist a login code for an (already allowlisted) email.
 * Returns the plaintext code to email, or null when the resend throttle is hit
 * (the caller should respond identically either way to avoid enumeration).
 */
export async function requestCode(email: string): Promise<{ code: string | null }> {
  const clean = email.toLowerCase().trim();
  const now = Date.now();
  const rows = await readRows();
  const existing = findRow(rows, clean);

  let windowStart = now;
  let sentCount = 1;
  if (existing && now - existing.windowStart < RESEND_WINDOW_MS) {
    if (existing.sentCount >= MAX_SENDS_PER_WINDOW) {
      return { code: null }; // throttled — do not email another code
    }
    windowStart = existing.windowStart;
    sentCount = existing.sentCount + 1;
  }

  // Cryptographically secure 6-digit code.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const next: Row = {
    rowNumber: existing?.rowNumber ?? 0,
    email: clean,
    codeHash: hashCode(clean, code),
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    windowStart,
    sentCount,
  };

  if (existing) {
    await writeRow(next);
  } else {
    await appendRow([next.email, next.codeHash, next.expiresAt, next.attempts, next.windowStart, next.sentCount]);
  }
  return { code };
}

/**
 * Verify a submitted code for an email. Enforces expiry, single use and the
 * attempt cap. Returns true only on an exact, in-time, in-budget match, and
 * invalidates the code on success. Never throws for a bad guess.
 */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  const clean = email.toLowerCase().trim();
  if (!/^\d{6}$/.test(code)) return false;

  const rows = await readRows();
  const row = findRow(rows, clean);
  if (!row || !row.codeHash) return false;

  const now = Date.now();
  if (now > row.expiresAt) return false;
  if (row.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  const matches = safeEqualHex(row.codeHash, hashCode(clean, code));
  if (matches) {
    // Single use: invalidate immediately.
    await writeRow({ ...row, codeHash: "", expiresAt: 0, attempts: row.attempts + 1 });
    return true;
  }

  await writeRow({ ...row, attempts: row.attempts + 1 });
  return false;
}
