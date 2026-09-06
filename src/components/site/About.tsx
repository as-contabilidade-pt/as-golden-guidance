import { Section, SectionHeading } from "./Section";
import { ShieldCheck, Briefcase, Lock, Gem, Scale } from "lucide-react";
import meetingImage from "@/assets/office-meeting.jpg";

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
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
        <div className="relative">
          <div className="absolute -left-4 -top-4 hidden h-full w-full border border-gold/25 lg:block" aria-hidden />
          <img
            src={meetingImage}
            alt="Sala de reuniões do escritório com mesa em mármore e iluminação dourada"
            width={1280}
            height={960}
            loading="lazy"
            className="relative h-full w-full object-cover"
          />
        </div>

        <div>
          <SectionHeading overline="Quem somos" title="Sobre Nós" align="left" />
          <p className="mt-8 text-sm leading-loose text-cream/70 sm:text-base">
            Somos representados pela Andreia Sofia, uma Contabilista Certificada com
            experiência e dedicação. Oferecemos serviços de contabilidade personalizados
            para empresas e trabalhadores independentes em Portugal.
          </p>
          <p className="mt-5 text-sm leading-loose text-cream/60 sm:text-base">
            Adaptamo-nos às necessidades do mundo de negócios atual, proporcionando
            serviços de contabilidade tanto remotamente como presencialmente. Junte-se a
            nós para um acompanhamento contabilístico e fiscal completo, com apoio à
            gestão, que vai além das necessidades legais.
          </p>

          <ul className="mt-10 flex flex-wrap gap-3">
            {valores.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 border border-gold/20 bg-ink-soft/50 px-4 py-3"
              >
                <Icon className="h-4 w-4 text-gold" strokeWidth={1.2} />
                <span className="text-[0.6rem] tracking-wider-caps text-cream/75">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
