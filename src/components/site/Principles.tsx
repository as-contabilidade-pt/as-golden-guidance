import { Section, SectionHeading } from "./Section";
import detailImage from "@/assets/office-detail.jpg";

export function Principles() {
  return (
    <Section id="principios" className="relative overflow-hidden bg-ink-soft">
      <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionHeading overline="A nossa abordagem" title="Princípios" align="left" />
          <p className="mt-8 text-sm leading-loose text-cream/70 sm:text-base">
            A nossa abordagem de trabalho centra-se em utilizar a contabilidade como uma
            ferramenta estratégica de apoio à gestão, indo além do mero cumprimento de
            obrigações.
          </p>
          <ul className="mt-10 space-y-6">
            {[
              [
                "Estratégia",
                "A contabilidade como instrumento de decisão e não apenas de conformidade.",
              ],
              [
                "Contabilidade digital",
                "Metodologia mais ecológica e eficiente, com menor consumo de recursos.",
              ],
              [
                "Rede de parceiros",
                "Áreas complementares que garantem um suporte abrangente ao seu negócio.",
              ],
            ].map(([title, text]) => (
              <li key={title} className="border-l border-gold/40 pl-6">
                <h3 className="font-serif text-lg text-cream">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/60">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute -bottom-4 -right-4 hidden h-full w-full border border-gold/25 lg:block" aria-hidden />
          <img
            src={detailImage}
            alt="Detalhe de secretária com caneta, documentos financeiros e candeeiro dourado"
            width={1280}
            height={960}
            loading="lazy"
            className="relative h-full w-full object-cover"
          />
        </div>
      </div>
    </Section>
  );
}
