/** Admin allowlist — set ADMIN_EMAILS in production (comma-separated). */
export function getAdminNotificationEmails(): string[] {
  return adminEmailAllowlist();
}

function adminEmailAllowlist(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS?.split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (fromEnv?.length) return fromEnv;

  if (process.env.NODE_ENV === "production") return [];

  // Local dev fallback when ADMIN_EMAILS is unset.
  return ["dev-admin@localhost"];
}

/** Gmail treats dots/plus-tags as equivalent; googlemail.com = gmail.com. */
export function normalizeEmailForAdmin(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  if (domain === "googlemail.com") domain = "gmail.com";

  if (domain === "gmail.com") {
    local = local.split("+")[0]!.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

export function isAdminEmail(email: string): boolean {
  const normalized = normalizeEmailForAdmin(email);
  return adminEmailAllowlist().some(
    (allowed) => normalizeEmailForAdmin(allowed) === normalized
  );
}

export function isAdminUser(user: { email: string }): boolean {
  return isAdminEmail(user.email);
}
