import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-config";
import { SITE_NAME } from "@/lib/site-config";

interface LegalDocumentLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalDocumentLayout({
  title,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-8 text-center">
        <p className="mb-2 font-display text-sm uppercase tracking-[0.2em] text-accent">
          {SITE_NAME}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-ink/55">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
      </header>

      <article className="space-y-8 text-sm leading-relaxed text-ink/85 sm:text-base">
        {children}
      </article>

      <p className="mt-10 text-center text-sm text-ink/55">
        <Link
          href="/"
          className="font-medium underline-offset-2 hover:text-ink hover:underline"
        >
          Back to the generator
        </Link>
        {" · "}
        <Link
          href="/terms"
          className="underline-offset-2 hover:text-ink hover:underline"
        >
          Terms
        </Link>
        {" · "}
        <Link
          href="/privacy"
          className="underline-offset-2 hover:text-ink hover:underline"
        >
          Privacy
        </Link>
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white/50 p-6 shadow-sm">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export { Section };
