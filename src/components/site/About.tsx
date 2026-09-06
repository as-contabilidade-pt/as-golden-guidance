import { Section, SectionHeading } from "./Section";
import { ShieldCheck, Briefcase, Lock, Gem, Scale } from "lucide-react";

const valores = [
  { icon: ShieldCheck, label: "Integridade" },
  { icon: Briefcase, label: "Profissionalismo" },
  { icon: Lock, label: "Confidencialidade" },
  { icon: Gem, label: "Excelência" },
  { icon: Scale, label: "Responsabilidade" },
];

export function About() {
  return (
    <Section id="sobre-nos" className="relative bg-ink">
      <div className="linen-pattern absolute inset-0 opacity-50" aria-hidden />
      <div className="relative">
        <SectionHeading overline="Quem somos" title="Sobre Nós" />

        <p className="mx-auto mt-12 max-w-3xl text-center text-sm leading-loose text-cream/75 sm:text-base">
          Somos representados pela Andreia Sofia, uma Contabilista Certificada com
          experiência e dedicação. Oferecemos serviços de contabilidade personalizados
          para empresas e trabalhadores independentes em Portugal. Adaptamo-nos às
          necessidades do mundo de negócios atual, proporcionando serviços de
          contabilidade tanto remotamente como presencialmente. Junte-se a nós para um
          acompanhamento contabilístico e fiscal completo, com apoio à gestão, que vai
          além das necessidades legais.
        </p>

        <ul className="mt-16 grid grid-cols-1 gap-px border border-gold/20 bg-gold/20 sm:grid-cols-2 lg:grid-cols-5">
          {valores.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex flex-col items-center gap-4 bg-ink px-6 py-10 text-center"
            >
              <Icon className="h-7 w-7 text-gold" strokeWidth={1} />
              <span className="text-[0.65rem] tracking-wider-caps text-cream/80">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
