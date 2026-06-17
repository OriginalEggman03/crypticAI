const RESEND_API_URL = "https://api.resend.com/emails";

function appOrigin(fallback?: string): string {
  return (
    process.env.APP_URL?.trim() ||
    fallback?.trim() ||
    "https://www.crypticai.uk"
  ).replace(/\/$/, "");
}

function emailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() || "CrypticAI <onboarding@crypticai.uk>"
  );
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
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not configured — cannot send verification email."
      );
    }
    console.info(`[dev] Email verification link for ${email}: ${verifyUrl}`);
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [email],
      subject: "Verify your CrypticAI account",
      html: `
        <p>Thanks for signing up for CrypticAI.</p>
        <p><a href="${verifyUrl}">Click here to verify your email</a> and start generating clues.</p>
        <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
        <p style="color:#666;font-size:12px">Or paste this URL into your browser:<br>${verifyUrl}</p>
      `,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to send verification email (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
}
