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

      <div className="relative mx-auto w-full max-w-6xl px-6 py-28 sm:py-32">
        <div className="max-w-2xl animate-fade-up">
          <span className="inline-flex rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 text-[0.68rem] font-medium text-gold">
            Contabilista Certificada · Viseu
          </span>

          <h1 className="mt-7 font-serif text-[2.6rem] leading-[1.08] text-cream sm:text-6xl md:text-[4.25rem]">
            AS{" "}
            <span className="text-gradient-gold">Contabilidade</span>
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-loose text-cream/70 sm:text-base">
            Descubra o nosso mundo de conhecimento em contabilidade, fiscalidade e gestão,
            onde cuidamos dos números para que se possa focar no crescimento do seu
            negócio.
          </p>

          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <GoldLink href="#servicos" className="w-full justify-center sm:w-auto">
              Ver serviços
            </GoldLink>
            <a
              href="#contactos"
              className="inline-flex w-full items-center justify-center rounded-full border border-cream/20 bg-cream/5 px-7 py-3.5 text-sm text-cream/90 transition-all hover:bg-cream/10 hover:text-gold sm:w-auto"
            >
              Falar connosco
            </a>
          </div>

          <dl className="mt-12 grid w-full grid-cols-3 gap-2 sm:mt-14 sm:max-w-lg sm:gap-4">
            {[
              ["Presencial", "e remoto"],
              ["Empresas", "e independentes"],
              ["Contabilidade", "digital"],
            ].map(([a, b]) => (
              <div
                key={a}
                className="flex flex-col items-center justify-center rounded-3xl border border-gold/15 bg-ink/40 px-2 py-3 text-center sm:px-5 sm:py-4"
              >
                <dt className="break-words font-serif text-[0.62rem] leading-tight text-gold sm:text-sm md:text-base">{a}</dt>
                <dd className="mt-0.5 text-[0.6rem] leading-tight text-cream/50 sm:mt-1 sm:text-xs">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
