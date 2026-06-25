import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentLayout, Section } from "@/components/LegalDocumentLayout";
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME } from "@/lib/legal-config";
import { CREDIT_PACK_LIST } from "@/lib/credit-packs";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for using ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const packSummary = CREDIT_PACK_LIST.map(
    (p) => `${p.credits} credits for ${p.priceLabel}`
  ).join("; ");

  return (
    <LegalDocumentLayout title="Terms of Service">
      <Section title="Agreement">
        <p>
          These terms govern your use of {SITE_NAME} (
          <a
            href={SITE_URL}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {SITE_URL.replace(/^https:\/\//, "")}
          </a>
          ), operated by {LEGAL_OPERATOR_NAME}. By creating an account or
          buying credits you agree to these terms and our{" "}
          <Link
            href="/privacy"
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="The service">
        <p>
          {SITE_NAME} generates British cryptic <strong>anagram</strong> clues
          from themes you provide. Clues are checked by automated verification
          before delivery, but we do not guarantee that every clue is fair,
          unique, publishable, or free of error. You are responsible for how you
          use any clue (e.g. in a crossword, blog, or competition).
        </p>
      </Section>

      <Section title="Accounts">
        <ul className="list-inside list-disc space-y-2">
          <li>You must provide a valid email and keep your password secure.</li>
          <li>You must verify your email before generating clues.</li>
          <li>
            You must be at least 18 years old to create an account and purchase
            credits, or have permission from a parent or guardian if younger
            where permitted by law.
          </li>
          <li>
            One person per account. Do not share credentials or abuse free spins
            or credits.
          </li>
        </ul>
      </Section>

      <Section title="Credits and payments">
        <p>
          New accounts receive free spins after email verification. Additional
          credits are sold as digital packs (currently: {packSummary}). Prices
          are shown before checkout and processed by Stripe.
        </p>
        <ul className="list-inside list-disc space-y-2">
          <li>
            Each successful clue generation consumes one credit (or a free spin
            where available).
          </li>
          <li>
            Credits are non-transferable and have no cash value except as
            described at purchase.
          </li>
          <li>
            If generation fails before a clue is delivered, a credit should not
            be consumed — contact us if you believe a credit was taken in error.
          </li>
          <li>
            Refunds: if you are a UK consumer, you may have statutory rights
            including a 14-day cancellation right for digital content in some
            circumstances. Once you use a credit to generate a clue, you
            acknowledge that performance has begun and statutory withdrawal
            rights may not apply to that used portion. Faulty or undelivered
            digital content may still entitle you to a repair, replacement, or
            refund under consumer law.
          </li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>You must not:</p>
        <ul className="list-inside list-disc space-y-2">
          <li>Use the service for unlawful, harassing, or infringing content.</li>
          <li>
            Attempt to break, scrape, or overload the service or bypass credit
            limits.
          </li>
          <li>
            Submit themes designed to produce offensive, defamatory, or illegal
            output.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that breach these terms.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The {SITE_NAME} name, site design, and software belong to us or our
          licensors. Clues generated for you are provided for your personal or
          editorial use; we do not claim ownership of the clue text, but we do
          not warrant that output is free of third-party rights. Do not
          present AI-generated clues as wholly human-authored where that would
          be misleading.
        </p>
      </Section>

      <Section title="Disclaimer and liability">
        <p>
          The service is provided &ldquo;as is&rdquo; to the fullest extent
          permitted by law. We do not exclude liability for death or personal
          injury caused by negligence, fraud, or any other liability that cannot
          be excluded under UK law.
        </p>
        <p>
          Subject to the above, we are not liable for indirect or consequential
          losses, or for loss of profit, data, or goodwill. Our total liability
          to you for any claim relating to the service is limited to the greater
          of (a) the amount you paid us in the 12 months before the claim or (b)
          £50.
        </p>
      </Section>

      <Section title="General">
        <ul className="list-inside list-disc space-y-2">
          <li>
            These terms are governed by the laws of England and Wales. Courts in
            England and Wales have exclusive jurisdiction, without prejudice to
            mandatory consumer protections in your country of residence.
          </li>
          <li>
            We may update these terms; continued use after changes are posted
            constitutes acceptance. Material changes may be notified by email.
          </li>
          <li>
            Questions:{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="underline-offset-2 hover:text-ink hover:underline"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </Section>
    </LegalDocumentLayout>
  );
}
