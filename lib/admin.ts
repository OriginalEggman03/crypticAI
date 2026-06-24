/** Hardcoded admin — unlimited test generations, credits never consumed. */
export const ADMIN_EMAIL = "tlittle64525@gmail.com";

function adminEmailAllowlist(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS?.split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : [ADMIN_EMAIL];
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
