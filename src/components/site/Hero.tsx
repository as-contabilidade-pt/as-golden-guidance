import { GoldLink } from "./GoldButton";
import { Corner } from "./Logo";

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6"
    >
      <div className="deco-pattern absolute inset-0 opacity-40" aria-hidden />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, transparent 20%, var(--ink) 78%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl py-32 text-center">
        <div className="mb-10 flex items-center justify-center gap-4">
          <span className="gold-rule w-16" />
          <span className="text-[0.6rem] tracking-wider-caps text-gold">
            Andreia Sofia · Contabilista Certificada · Viseu
          </span>
          <span className="gold-rule w-16" />
        </div>

        <div className="relative px-4 py-10">
          <Corner className="absolute left-0 top-0" />
          <Corner className="absolute right-0 top-0 rotate-90" />
          <Corner className="absolute bottom-0 right-0 rotate-180" />
          <Corner className="absolute bottom-0 left-0 -rotate-90" />

          <h1 className="font-serif text-4xl leading-tight text-cream sm:text-6xl md:text-7xl">
            Seja bem-vindo!
          </h1>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-cream/70 sm:text-base">
          Descubra o nosso mundo de conhecimento em contabilidade, fiscalidade e gestão,
          onde cuidamos dos números para que se possa focar no crescimento do seu
          negócio, através dos nossos serviços de apoio à gestão.
        </p>

        <div className="mt-12">
          <GoldLink href="#sobre-nos">Conheça-nos</GoldLink>
        </div>
      </div>
    </section>
  );
}
