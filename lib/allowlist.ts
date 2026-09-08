// Single source of truth for who may sign in — enforced for BOTH Google login
// and email-code login. The list lives in the ALLOWED_EMAILS env var so there is
// no database and no per-user cost.
//
// Format: comma-separated entries, each `email` or `email:Display Name`.
//   ALLOWED_EMAILS="alice@example.com:Alice,bob@example.com:Bob,carol@example.com"
//
// If a display name is omitted it is derived from the email local-part. The name
// is what gets attributed to each expense for code-login users (Google supplies
// its own profile name).

export interface AllowedUser {
  email: string;
  name: string;
}

function deriveName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const pretty = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return pretty || email;
}

function parseAllowlist(): AllowedUser[] {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [emailPart, ...nameParts] = entry.split(":");
      const email = emailPart.trim().toLowerCase();
      const name = nameParts.join(":").trim();
      return { email, name: name || deriveName(email) };
    })
    .filter((u) => u.email.includes("@"));
}

/** Returns the allowlisted user for an email, or undefined if not allowed. */
export function findAllowedUser(email?: string | null): AllowedUser | undefined {
  if (!email) return undefined;
  const target = email.toLowerCase().trim();
  return parseAllowlist().find((u) => u.email === target);
}

/** True only if the email is on the allowlist. */
export function isAllowed(email?: string | null): boolean {
  return findAllowedUser(email) !== undefined;
}
