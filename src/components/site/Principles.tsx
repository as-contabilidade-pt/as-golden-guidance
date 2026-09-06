import { Section, SectionHeading } from "./Section";
import detailImage from "@/assets/office-detail.jpg";

const principios = [
  {
    numero: "01",
    title: "Estratégia",
    text: "A contabilidade como instrumento de decisão e não apenas de conformidade legal. Transformamos números em orientação clara para o seu negócio crescer com confiança.",
  },
  {
    numero: "02",
    title: "Contabilidade digital",
    text: "Metodologia mais ecológica e eficiente, com menor consumo de recursos. Processos digitais que poupam tempo e simplificam o dia a dia.",
  },
  {
    numero: "03",
    title: "Rede de parceiros",
    text: "Áreas complementares que garantem um suporte abrangente ao seu negócio — do acompanhamento jurídico ao apoio à gestão.",
  },
];

export function Principles() {
  return (
    <Section id="principios" className="relative bg-ink-soft">
      <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="relative order-2 lg:order-1">
          <img
            src={detailImage}
            alt="Detalhe do escritório com documentos e caneta dourada"
            width={1280}
            height={960}
            loading="lazy"
            className="h-72 w-full rounded-[2.5rem] object-cover sm:h-96 lg:h-[30rem]"
          />
          <div className="absolute -right-3 -top-3 hidden rounded-full border border-gold/25 bg-ink px-6 py-3 sm:block">
            <p className="font-serif text-sm text-gold">Desde o primeiro dia, ao seu lado.</p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <SectionHeading overline="A nossa abordagem" title="Princípios" align="left" />
          <p className="mt-6 text-sm leading-loose text-cream/65 sm:text-base">
            A nossa abordagem centra-se em utilizar a contabilidade como uma ferramenta
            estratégica de apoio à gestão, indo além do mero cumprimento de obrigações.
          </p>

          <ol className="mt-10 space-y-0">
            {principios.map(({ numero, title, text }, i) => (
              <li
                key={numero}
                className={`group flex gap-6 py-7 ${i > 0 ? "border-t border-gold/15" : ""}`}
              >
                <span className="font-serif text-3xl leading-none text-gold/40 transition-colors duration-300 group-hover:text-gold sm:text-4xl">
                  {numero}
                </span>
                <div>
                  <h3 className="font-serif text-xl text-cream sm:text-2xl">{title}</h3>
                  <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-cream/60">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
