import { sendResendEmail } from "@/lib/email/resend";

function appOrigin(fallback?: string): string {
  return (
    process.env.APP_URL?.trim() ||
    fallback?.trim() ||
    "https://www.crypticai.uk"
  ).replace(/\/$/, "");
}

export function buildVerificationUrl(token: string, origin?: string): string {
  const base = appOrigin(origin);
  return `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  origin?: string
): Promise<void> {
  const verifyUrl = buildVerificationUrl(token, origin);

  await sendResendEmail({
    to: email,
    subject: "Verify your CrypticAI account",
    html: `
      <p>Thanks for signing up for CrypticAI.</p>
      <p><a href="${verifyUrl}">Click here to verify your email</a> and start generating clues.</p>
      <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
      <p style="color:#666;font-size:12px">Or paste this URL into your browser:<br>${verifyUrl}</p>
    `,
  });
}
