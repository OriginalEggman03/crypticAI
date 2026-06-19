import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-cream/30">
      <div className="mx-auto max-w-3xl px-4 py-6 text-center text-sm text-ink/50 sm:px-6">
        <Link
          href="/about"
          className="font-medium underline-offset-2 hover:text-ink hover:underline"
        >
          About Cryptic AI
        </Link>
      </div>
    </footer>
  );
}
