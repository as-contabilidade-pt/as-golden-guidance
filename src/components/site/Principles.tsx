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
    <Section id="principios" className="relative bg-ink">
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="relative order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-gold/20 shadow-[0_32px_80px_-32px_color-mix(in_oklab,var(--ink)_60%,transparent)]">
            <img
              src={detailImage}
              alt="Detalhe do escritório com documentos e caneta dourada"
              width={1280}
              height={960}
              loading="lazy"
              className="h-80 w-full object-cover transition-transform duration-700 hover:scale-105 sm:h-96 lg:h-[32rem]"
            />
          </div>
          <div className="absolute -bottom-4 right-6 rounded-full border border-gold/25 bg-gold px-5 py-2.5 shadow-lg sm:right-10">
            <p className="font-serif text-xs font-medium text-ink">Desde o primeiro dia, ao seu lado.</p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <SectionHeading overline="A nossa abordagem" title="Princípios" align="left" light />
          <p className="mt-6 text-sm leading-loose text-cream/70 sm:text-base">
            A nossa abordagem centra-se em utilizar a contabilidade como uma ferramenta
            estratégica de apoio à gestão, indo além do mero cumprimento de obrigações.
          </p>

          <ol className="mt-12 space-y-10">
            {principios.map(({ numero, title, text }) => (
              <li key={numero} className="group flex gap-5">
                <span className="shrink-0 font-serif text-3xl italic leading-none text-gold/80 sm:text-4xl">
                  {numero}
                </span>
                <div className="pt-1">
                  <h3 className="font-serif text-xl tracking-wide text-cream sm:text-2xl">
                    {title}
                  </h3>
                  <div className="mt-2 h-px w-8 bg-gold/30 transition-all duration-500 group-hover:w-16" />
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-cream/65">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
