import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-cream/30">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-ink/50 sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link
            href="/about"
            className="font-medium underline-offset-2 hover:text-ink hover:underline"
          >
            About
          </Link>
          <Link
            href="/terms"
            className="font-medium underline-offset-2 hover:text-ink hover:underline"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="font-medium underline-offset-2 hover:text-ink hover:underline"
          >
            Privacy
          </Link>
        </nav>
        <p className="max-w-md text-xs leading-relaxed text-ink/45">
          We use a session cookie when you sign in. No analytics cookies. See
          Privacy for details.
        </p>
      </div>
    </footer>
  );
}
