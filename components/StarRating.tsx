"use client";

interface StarRatingProps {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}

export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  label = "Rate this clue",
}: StarRatingProps) {
  const starClass = size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink/80">{label}</p>
      <div
        className="flex gap-1"
        role="radiogroup"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = value !== null && star <= value;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              onClick={() => onChange(star)}
              className={`${starClass} transition disabled:cursor-not-allowed disabled:opacity-50 ${
                filled ? "text-amber-500" : "text-ink/20 hover:text-amber-400"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StarDisplay({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const starClass = size === "sm" ? "text-sm" : "text-base";
  return (
    <span
      className={`${starClass} text-amber-500`}
      aria-label={`${rating} out of 5 stars`}
    >
      {"★".repeat(rating)}
      <span className="text-ink/15">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
