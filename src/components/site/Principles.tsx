import { Section, SectionHeading } from "./Section";
import { Corner } from "./Logo";

export function Principles() {
  return (
    <Section id="principios" className="relative bg-ink-soft">
      <div className="deco-pattern absolute inset-0 opacity-30" aria-hidden />
      <div className="relative">
        <SectionHeading overline="A nossa abordagem" title="Princípios" />

        <div className="relative mx-auto mt-14 max-w-3xl px-6 py-12">
          <Corner className="absolute left-0 top-0" />
          <Corner className="absolute right-0 top-0 rotate-90" />
          <Corner className="absolute bottom-0 right-0 rotate-180" />
          <Corner className="absolute bottom-0 left-0 -rotate-90" />

          <p className="text-center text-sm leading-loose text-cream/75 sm:text-base">
            A nossa abordagem de trabalho centra-se em utilizar a contabilidade como uma
            ferramenta estratégica de apoio à gestão, indo além do mero cumprimento de
            obrigações. Adotamos a contabilidade digital para uma metodologia mais
            ecológica e eficiente, minimizando o consumo de recursos com o uso de
            ferramentas digitais. Além disso, contamos com uma rede de parceiros em áreas
            complementares para oferecermos um suporte abrangente.
          </p>
        </div>
      </div>
    </Section>
  );
}
