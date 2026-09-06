import type { ComponentPropsWithoutRef } from "react";

const base =
  "inline-flex items-center justify-center rounded-full bg-gold px-7 py-3.5 text-sm font-medium text-ink shadow-[0_10px_28px_-12px_color-mix(in_oklab,var(--gold)_60%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-deep hover:shadow-[0_16px_36px_-12px_color-mix(in_oklab,var(--gold)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-60";

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

const outlineBase =
  "inline-flex items-center justify-center rounded-full border border-ink/15 px-7 py-3.5 text-sm font-medium text-ink transition-all duration-300 hover:border-gold hover:bg-gold/5 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-60";

export function OutlineLink({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"a">) {
  return <a className={`${outlineBase} ${className}`} {...props} />;
}

export function OutlineButton({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return <button className={`${outlineBase} ${className}`} {...props} />;
}
