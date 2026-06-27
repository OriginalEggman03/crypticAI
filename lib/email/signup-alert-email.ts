import { getAdminNotificationEmails } from "@/lib/admin";
import { sendResendEmail } from "@/lib/email/resend";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatSignupTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date());
}

export async function sendNewSignupAlertEmail(signupEmail: string): Promise<void> {
  const admins = getAdminNotificationEmails();
  if (!admins.length) return;

  const email = signupEmail.trim().toLowerCase();
  const signedUpAt = formatSignupTime();

  await sendResendEmail({
    to: admins,
    subject: `New ${SITE_NAME} signup — ${email}`,
    html: `
      <p>A new account was created on ${SITE_NAME}.</p>
      <table style="border-collapse:collapse;margin:16px 0;font-size:15px;line-height:1.5">
        <tr><td style="padding:4px 16px 4px 0;color:#666">Email</td><td style="padding:4px 0"><strong>${escapeHtml(email)}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Signed up</td><td style="padding:4px 0">${signedUpAt}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Status</td><td style="padding:4px 0">Awaiting email verification</td></tr>
      </table>
      <p style="color:#666;font-size:12px">They must verify their email before they can generate clues. Site: <a href="${SITE_URL}">${SITE_URL.replace(/^https:\/\//, "")}</a></p>
    `,
  });
}
