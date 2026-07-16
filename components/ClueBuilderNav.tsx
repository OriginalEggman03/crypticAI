"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const builders = [
  { href: "/", label: "Anagram" },
  { href: "/homophone", label: "Homophone" },
] as const;

export function ClueBuilderNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Clue builders"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {builders.map((builder) => {
        const active =
          builder.href === "/"
            ? pathname === "/"
            : pathname.startsWith(builder.href);

        return (
          <Link
            key={builder.href}
            href={builder.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition sm:text-sm ${
              active
                ? "border-accent/40 bg-accent/10 text-ink"
                : "border-ink/15 bg-white/80 text-ink/75 hover:bg-cream/80 hover:text-ink"
            }`}
          >
            {builder.label}
          </Link>
        );
      })}
    </nav>
  );
}
