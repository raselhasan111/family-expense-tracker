import nodemailer from "nodemailer";

// Sends login codes over Gmail SMTP using an App Password — free, no third-party
// email service. Requires GMAIL_USER (the Gmail address) and GMAIL_APP_PASSWORD
// (a 16-char App Password generated with 2FA enabled on that account).

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Missing required environment variables: GMAIL_USER, GMAIL_APP_PASSWORD");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendLoginCode(to: string, code: string): Promise<void> {
  const transport = getTransport();
  const from = process.env.GMAIL_USER;

  await transport.sendMail({
    from: `Family Expense Tracker <${from}>`,
    to,
    subject: `Your login code is ${code}`,
    text: `Your Family Expense Tracker login code is ${code}. It expires in 10 minutes. If you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 8px; color: #059669;">Family Expense Tracker</h2>
        <p style="color: #334155; margin: 0 0 20px;">Use this code to sign in:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; background: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center;">${code}</div>
        <p style="color: #64748b; font-size: 13px; margin: 20px 0 0;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
      </div>
    `,
  });
}
