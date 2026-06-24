/** Hardcoded admin — unlimited test generations, credits never consumed. */
export const ADMIN_EMAIL = "tlittle64525@gmail.com";

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function isAdminUser(user: { email: string }): boolean {
  return isAdminEmail(user.email);
}
