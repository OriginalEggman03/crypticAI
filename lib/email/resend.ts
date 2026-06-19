const RESEND_API_URL = "https://api.resend.com/emails";

export function emailFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() || "CrypticAI <onboarding@crypticai.uk>"
  );
}

export async function sendResendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = options.to.trim();

  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured — cannot send email.");
    }
    console.info(`[dev] Email to ${to}: ${options.subject}`);
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFromAddress(),
      to: [to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to send email (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
}
