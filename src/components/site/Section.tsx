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
        <p className="tracking-wider-caps text-[0.68rem] text-gold">{overline}</p>
      ) : null}
      <h2 className="mt-4 font-serif text-3xl text-cream sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      <div
        className={`gold-rule mt-6 w-24 ${align === "center" ? "mx-auto" : ""}`}
      />
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
