import type { ComponentPropsWithoutRef } from "react";

const base =
  "inline-flex items-center justify-center rounded-full border border-gold/70 px-8 py-3.5 text-sm font-medium text-gold transition-all duration-300 hover:bg-gold hover:text-ink hover:shadow-[0_12px_30px_-12px_var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-60";

export function GoldLink({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"a">) {
  return <a className={`${base} ${className}`} {...props} />;
}

export function GoldButton({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return <button className={`${base} ${className}`} {...props} />;
}
