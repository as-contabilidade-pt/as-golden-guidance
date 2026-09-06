export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-ink"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="font-serif leading-none text-gold"
        style={{ fontSize: size * 0.55 }}
      >
        S
      </span>
    </span>
  );
}

export function Corner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 text-gold/60 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden
    >
      <path d="M1 23V9L9 1h14" />
      <path d="M5 23V11l7-7h11" />
    </svg>
  );
}
