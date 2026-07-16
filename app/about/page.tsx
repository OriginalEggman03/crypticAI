import Link from "next/link";
import type { Metadata } from "next";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE_NAME} — the AI-powered British cryptic ${SITE_TAGLINE}. Generate themed clues, archive your favourites, and share them online.`,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "website",
    url: "/about",
    title: `About ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `About ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-10 text-center">
        <p className="mb-2 font-display text-sm uppercase tracking-[0.2em] text-accent">
          {SITE_NAME}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          About Cryptic AI
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
          {SITE_TAGLINE} for British cryptic crossword fans.
        </p>
      </header>

      <article className="space-y-6 text-sm leading-relaxed text-ink/85 sm:text-base">
        <section className="rounded-2xl border border-ink/10 bg-cream/50 p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-ink">
            What is Cryptic AI?
          </h2>
          <p className="mt-3">
            Cryptic AI is an online Cryptic Clue Builder. Give it a theme — Bond
            villains, English cheeses, Wimbledon champions — and it writes a fair
            British cryptic anagram clue with verified letter counts, natural
            surface reading, and varied anagram indicators.
          </p>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white/50 p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-ink">
            How it works
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li>Sign up and verify your email — you get free spins to try it.</li>
            <li>Enter an inspiration theme and choose easy or hard difficulty.</li>
            <li>Cryptic AI finds a valid answer and fodder pair, then polishes the clue.</li>
            <li>Rate and archive clues you like, then search the archive later.</li>
            <li>Share clues via WhatsApp, email, or social media.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white/50 p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-ink">
            Credits and pricing
          </h2>
          <p className="mt-3">
            New accounts receive free spins after email verification. When you
            need more, buy credit packs securely via Stripe. Every generation uses
            one credit and produces a clue checked by automated verification
            before you see it.
          </p>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white/50 p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-ink">
            Who is it for?
          </h2>
          <p className="mt-3">
            Cryptic AI is for crossword setters looking for themed anagram
            ideas, solvers who enjoy cryptic wordplay, and anyone who wants
            quick, publishable anagram clues without starting from a blank page.
          </p>
        </section>
      </article>

      <footer className="mt-12 flex flex-col items-center gap-4 text-center text-sm">
        <Link
          href="/"
          className="rounded-lg border border-ink/15 bg-white/80 px-4 py-2 font-medium text-ink shadow-sm transition hover:bg-cream/80"
        >
          Open the generator
        </Link>
        <p className="text-ink/50">
          <a
            href={SITE_URL}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {SITE_URL.replace(/^https:\/\//, "")}
          </a>
        </p>
      </footer>
    </main>
  );
}
