export function Logo({ size = 44 }: { size?: number }) {
  return (
    <img
      src="/as-logo.png"
      alt="AS Contabilidade"
      width={size}
      height={size}
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size }}
    />
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
