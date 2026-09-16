import { GoldLink } from "./GoldButton";
import heroImage from "@/assets/office-hero.jpg";

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-ink"
    >
      <img
        src={heroImage}
        alt="Interior do escritório de contabilidade em tons escuros e dourados"
        width={1920}
        height={1280}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/10" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-32">
        <div className="max-w-2xl animate-fade-up">
          <span className="inline-flex rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-[0.68rem] font-medium text-gold">
            Contabilista Certificada · Viseu
          </span>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <span className="font-serif text-5xl font-medium leading-none text-gold sm:text-6xl md:text-7xl">
              AS
            </span>
            <div className="hidden h-12 w-px bg-gold/30 sm:block" />
            <div className="flex flex-col">
              <span className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-cream/80 sm:text-xs">
                Contabilidade
              </span>
              <span className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em] text-cream/80 sm:text-xs">
                Fiscalidade e Gestão
              </span>
            </div>
          </div>

          <h1 className="mt-8 font-serif text-5xl leading-[1.05] text-cream sm:text-6xl md:text-[4.25rem]">
            Números com{" "}
            <span className="text-gradient-gold">rigor e visão</span>.
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-loose text-cream/70 sm:text-base">
            Descubra o nosso mundo de conhecimento em contabilidade, fiscalidade e gestão,
            onde cuidamos dos números para que se possa focar no crescimento do seu
            negócio.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <GoldLink href="#servicos">Ver serviços</GoldLink>
            <a
              href="#contactos"
              className="inline-flex items-center justify-center rounded-full border border-cream/20 bg-cream/5 px-7 py-3.5 text-sm text-cream/90 transition-all hover:bg-cream/10 hover:text-gold"
            >
              Falar connosco
            </a>
          </div>

          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-4">
            {[
              ["Presencial", "e remoto"],
              ["Empresas", "e independentes"],
              ["Contabilidade", "digital"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-3xl border border-gold/15 bg-ink/40 px-5 py-4">
                <dt className="font-serif text-base text-gold sm:text-lg">{a}</dt>
                <dd className="mt-1 text-xs text-cream/50">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
