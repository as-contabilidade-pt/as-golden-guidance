import { Section, SectionHeading } from "./Section";
import { Compass, Leaf, Handshake } from "lucide-react";

const principios = [
  {
    icon: Compass,
    title: "Estratégia",
    text: "A contabilidade como instrumento de decisão e não apenas de conformidade legal.",
  },
  {
    icon: Leaf,
    title: "Contabilidade digital",
    text: "Metodologia mais ecológica e eficiente, com menor consumo de recursos.",
  },
  {
    icon: Handshake,
    title: "Rede de parceiros",
    text: "Áreas complementares que garantem um suporte abrangente ao seu negócio.",
  },
];

export function Principles() {
  return (
    <Section id="principios" className="relative bg-ink-soft">
      <SectionHeading overline="A nossa abordagem" title="Princípios" />

      <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-loose text-cream/65 sm:text-base">
        A nossa abordagem centra-se em utilizar a contabilidade como uma ferramenta
        estratégica de apoio à gestão, indo além do mero cumprimento de obrigações.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {principios.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="soft-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold/45"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/10 text-gold">
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <h3 className="mt-6 font-serif text-xl text-cream">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-cream/60">{text}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
