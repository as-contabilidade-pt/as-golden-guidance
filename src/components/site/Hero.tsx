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
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-32">
        <div className="max-w-2xl animate-fade-up">
          <div className="mb-8 flex items-center gap-4">
            <span className="gold-rule w-12" />
            <span className="text-[0.6rem] tracking-wider-caps text-gold">
              Contabilista Certificada · Viseu
            </span>
          </div>

          <h1 className="font-serif text-5xl leading-[1.05] text-cream sm:text-6xl md:text-7xl">
            Números com
            <span className="block text-gradient-gold italic">rigor e visão</span>
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-loose text-cream/70 sm:text-base">
            Descubra o nosso mundo de conhecimento em contabilidade, fiscalidade e gestão,
            onde cuidamos dos números para que se possa focar no crescimento do seu
            negócio.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <GoldLink href="#servicos">Ver serviços</GoldLink>
            <a
              href="#contactos"
              className="text-[0.65rem] tracking-wider-caps text-cream/70 transition-colors hover:text-gold"
            >
              Falar connosco
            </a>
          </div>

          <dl className="mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-gold/20 pt-8">
            {[
              ["Presencial", "e remoto"],
              ["Empresas", "e independentes"],
              ["Contabilidade", "digital"],
            ].map(([a, b]) => (
              <div key={a}>
                <dt className="font-serif text-base text-gold sm:text-lg">{a}</dt>
                <dd className="mt-1 text-[0.6rem] tracking-wider-caps text-cream/50">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
