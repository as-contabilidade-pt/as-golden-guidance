import type { ComponentPropsWithoutRef } from "react";

const base =
  "inline-flex items-center justify-center border border-gold px-8 py-3 text-[0.7rem] tracking-wider-caps text-gold transition-colors duration-300 hover:bg-gold hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:opacity-60";

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
