import { NextResponse } from "next/server";
import { isAllowed } from "@/lib/allowlist";
import { requestCode } from "@/lib/otp";
import { sendLoginCode } from "@/lib/mailer";

// Issues an email login code. Always responds with the same generic message so
// the endpoint never reveals whether an email is registered (no user
// enumeration), and swallows delivery/config errors from the client for the
// same reason (they are logged server-side instead).
const GENERIC = {
  ok: true,
  message: "If your email is registered, a login code has been sent.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email ?? "").toLowerCase().trim();

    // Silently no-op for anything not on the allowlist.
    if (!email || !isAllowed(email)) {
      return NextResponse.json(GENERIC, { status: 200 });
    }

    const { code } = await requestCode(email);
    if (code) {
      await sendLoginCode(email, code);
    }
    return NextResponse.json(GENERIC, { status: 200 });
  } catch (error) {
    console.error("OTP request error:", error);
    // Never leak config/delivery failures to the client.
    return NextResponse.json(GENERIC, { status: 200 });
  }
}
