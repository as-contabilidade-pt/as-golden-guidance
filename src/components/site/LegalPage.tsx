import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export type LegalSection = { id: string; title: string; body: ReactNode };

export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <Header />
      <main className="bg-background px-6 pt-32 pb-24">
        <article className="mx-auto max-w-[800px]">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold-deep">
            <ChevronLeft className="h-4 w-4" /> Voltar ao início
          </Link>
          <h1 className="mt-6 font-serif text-4xl text-foreground sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Última atualização: {updated}</p>

          <nav aria-label="Índice" className="mt-10 rounded-3xl border border-gold/25 bg-card p-6">
            <p className="text-sm font-medium text-gold">Índice</p>
            <ol className="mt-4 space-y-2 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-foreground/80 hover:text-gold">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-12 space-y-12">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="font-serif text-2xl text-foreground">{s.title}</h2>
                <div className="legal-body mt-4 space-y-4 text-[15px] leading-relaxed text-foreground/80">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink hover:bg-gold-deep"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar ao início
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

export function LegalTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gold/25">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-ink text-gold">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gold/15 align-top odd:bg-card">
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 ${j === 0 ? "font-medium text-foreground" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
