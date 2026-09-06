import type { ReactNode } from "react";

export function SectionHeading({
  overline,
  title,
  align = "center",
}: {
  overline?: string;
  title: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      {overline ? (
        <span
          className={`inline-flex rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-[0.68rem] font-medium tracking-wide text-gold ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {overline}
        </span>
      ) : null}
      <h2 className="mt-5 font-serif text-3xl leading-tight text-cream sm:text-4xl md:text-[2.85rem]">
        {title}
      </h2>
    </div>
  );
}

export function Section({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`px-6 py-24 md:py-32 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
