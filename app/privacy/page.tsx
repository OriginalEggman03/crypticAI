import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentLayout, Section } from "@/components/LegalDocumentLayout";
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME } from "@/lib/legal-config";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your personal data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy">
      <Section title="Who we are">
        <p>
          {LEGAL_OPERATOR_NAME} operates {SITE_NAME} at{" "}
          <a
            href={SITE_URL}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {SITE_URL.replace(/^https:\/\//, "")}
          </a>
          . This policy explains how we handle personal data when you use the
          service.
        </p>
        <p>
          Contact:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-inside list-disc space-y-2">
          <li>
            <strong>Account data:</strong> email address and a hashed password
            when you register.
          </li>
          <li>
            <strong>Usage data:</strong> credits balance, free spins used, clues
            you archive (inspiration, clue text, answer, fodder, rating), and
            server logs (e.g. IP address, timestamps) for security and
            debugging.
          </li>
          <li>
            <strong>Generation content:</strong> inspiration themes and prompts
            you submit are sent to our AI provider to generate clues.
          </li>
          <li>
            <strong>Payment data:</strong> we do not store card numbers. Stripe
            processes payments and shares transaction references with us (e.g.
            amount, status, your email).
          </li>
        </ul>
      </Section>

      <Section title="Why we use your data">
        <ul className="list-inside list-disc space-y-2">
          <li>
            To create and manage your account and verify your email (
            <strong>contract</strong>).
          </li>
          <li>
            To provide clue generation, credits, and the archive (
            <strong>contract</strong>).
          </li>
          <li>
            To send verification and purchase receipt emails (
            <strong>contract</strong>).
          </li>
          <li>
            To keep the service secure and prevent abuse (
            <strong>legitimate interests</strong>).
          </li>
        </ul>
      </Section>

      <Section title="Who we share data with">
        <ul className="list-inside list-disc space-y-2">
          <li>
            <strong>Anthropic</strong> — processes your inspiration and prompts
            to generate clues.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing when you buy credits.
          </li>
          <li>
            <strong>Resend</strong> (or our email provider) — transactional
            emails such as verification and receipts.
          </li>
          <li>
            <strong>Railway</strong> (or our hosting provider) — stores the
            application database on infrastructure in supported regions.
          </li>
        </ul>
        <p>We do not sell your personal data.</p>
      </Section>

      <Section title="Cookies">
        <p>
          We use a <strong>strictly necessary</strong> session cookie when you
          sign in so you stay logged in. It is httpOnly and secure in
          production. We do not use analytics or advertising cookies on{" "}
          {SITE_NAME} at this time.
        </p>
        <p>
          When you buy credits, you are redirected to <strong>Stripe</strong>,
          which may set its own cookies on Stripe&apos;s domain to complete
          payment.
        </p>
      </Section>

      <Section title="How long we keep data">
        <p>
          We keep your account and archived clues until you delete your account.
          Verification tokens expire automatically. Payment records may be kept
          as long as needed for tax, accounting, and dispute handling.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under UK data protection law you may have the right to access, correct,
          erase, restrict, or object to certain processing, and to data
          portability where applicable.
        </p>
        <p>
          You can delete your account at any time from the account menu in the
          app. You may also contact us at {LEGAL_CONTACT_EMAIL}. You have the
          right to complain to the UK Information Commissioner&apos;s Office (
          <a
            href="https://ico.org.uk"
            className="underline-offset-2 hover:text-ink hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            ico.org.uk
          </a>
          ).
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy from time to time. We will post the new
          version on this page with an updated date. Significant changes may
          also be notified by email where appropriate.
        </p>
        <p>
          See also our{" "}
          <Link
            href="/terms"
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            Terms of Service
          </Link>
          .
        </p>
      </Section>
    </LegalDocumentLayout>
  );
}
