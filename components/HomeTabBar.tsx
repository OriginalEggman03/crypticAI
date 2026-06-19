"use client";

export type HomeTab = "create" | "archive";

const tabs: { value: HomeTab; label: string }[] = [
  { value: "create", label: "New" },
  { value: "archive", label: "Archive" },
];

interface HomeTabBarProps {
  value: HomeTab;
  onChange: (tab: HomeTab) => void;
}

export function HomeTabBar({ value, onChange }: HomeTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Main sections"
      className="mb-8 grid grid-cols-2 gap-2"
    >
      {tabs.map((tab) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${tab.value}`}
            id={`tab-${tab.value}`}
            onClick={() => onChange(tab.value)}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent/20 ${
              selected
                ? "border-accent bg-accent/10 text-ink shadow-sm"
                : "border-ink/15 bg-white/80 text-ink/70 hover:border-ink/25 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
