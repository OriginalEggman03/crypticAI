import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-6xl font-semibold text-ink/20">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-ink/70">
        That link doesn&apos;t match anything on CrypticAI.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
      >
        Back to clue generator
      </Link>
    </main>
  );
}
