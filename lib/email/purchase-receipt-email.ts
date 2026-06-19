import type Stripe from "stripe";
import { getCreditPack } from "@/lib/credit-packs";
import { formatCreditsSummary } from "@/lib/credits-display";
import type { CreditsStatus } from "@/lib/types";
import { sendResendEmail } from "@/lib/email/resend";

function formatPaidAmount(session: Stripe.Checkout.Session): string {
  if (session.amount_total == null) return "—";
  const currency = (session.currency ?? "gbp").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(session.amount_total / 100);
  } catch {
    return `${(session.amount_total / 100).toFixed(2)} ${currency}`;
  }
}

function formatPurchaseDate(session: Stripe.Checkout.Session): string {
  const unix = session.created ?? Math.floor(Date.now() / 1000);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(unix * 1000));
}

export async function sendPurchaseReceiptEmail(options: {
  to: string;
  session: Stripe.Checkout.Session;
  creditsGranted: number;
  creditsStatus: CreditsStatus;
}): Promise<void> {
  const { to, session, creditsGranted, creditsStatus } = options;
  const packId = session.metadata?.packId ?? "";
  const pack = getCreditPack(packId);
  const packLabel = pack
    ? `${pack.credits} clue credits`
    : `${creditsGranted} clue credit${creditsGranted === 1 ? "" : "s"}`;
  const amount = formatPaidAmount(session);
  const purchasedAt = formatPurchaseDate(session);
  const receiptId = session.id;
  const balance = formatCreditsSummary(creditsStatus);

  await sendResendEmail({
    to,
    subject: `Your Cryptic AI receipt — ${packLabel}`,
    html: `
      <p>Thank you for your purchase.</p>
      <table style="border-collapse:collapse;margin:16px 0;font-size:15px;line-height:1.5">
        <tr><td style="padding:4px 16px 4px 0;color:#666">Item</td><td style="padding:4px 0"><strong>${packLabel}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Amount paid</td><td style="padding:4px 0"><strong>${amount}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Date</td><td style="padding:4px 0">${purchasedAt}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Receipt</td><td style="padding:4px 0;font-family:monospace;font-size:13px">${receiptId}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#666">Your balance</td><td style="padding:4px 0">${balance}</td></tr>
      </table>
      <p>Credits have been added to your Cryptic AI account and are ready to use.</p>
      <p style="color:#666;font-size:12px">If you have questions about this purchase, reply to this email with your receipt ID above.</p>
    `,
  });
}
