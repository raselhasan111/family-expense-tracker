import { google, sheets_v4 } from "googleapis";

// Shared Google Sheets service-account client (the app's backing "database").
// The signed-in user is NOT the identity used here — this is a separate service
// account with least-privilege access to the one spreadsheet.

const REQUIRED = ["GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_SHEET_ID"] as const;

export function checkSheetEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getSheetsClient(): sheets_v4.Sheets {
  checkSheetEnv();
  // Stored with literal "\n" sequences; convert back to real newlines at runtime.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    // Least privilege: reading/writing cell values only needs the spreadsheets scope.
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export function spreadsheetId(): string {
  return process.env.GOOGLE_SHEET_ID as string;
}
