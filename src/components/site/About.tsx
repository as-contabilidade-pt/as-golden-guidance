import { Section, SectionHeading } from "./Section";
import { ShieldCheck, Briefcase, Lock, Gem, Scale } from "lucide-react";
import meetingImage from "@/assets/office-meeting.jpg";
import detailImage from "@/assets/office-detail.jpg";

const valores = [
  { icon: ShieldCheck, label: "Integridade" },
  { icon: Briefcase, label: "Profissionalismo" },
  { icon: Lock, label: "Confidencialidade" },
  { icon: Gem, label: "Excelência" },
  { icon: Scale, label: "Responsabilidade" },
];

export function About() {
  return (
    <Section id="sobre-nos" className="relative bg-background">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div className="relative">
          <img
            src={meetingImage}
            alt="Sala de reuniões do escritório com mesa em mármore e iluminação dourada"
            width={1280}
            height={960}
            loading="lazy"
            className="h-[26rem] w-full rounded-[2.5rem] object-cover shadow-[0_24px_60px_-24px_color-mix(in_oklab,var(--ink)_18%,transparent)]"
          />
          <img
            src={detailImage}
            alt="Detalhe de secretária com caneta e documentos financeiros"
            width={1280}
            height={960}
            loading="lazy"
            className="absolute -bottom-10 right-4 hidden h-40 w-56 rounded-[1.75rem] border-4 border-background object-cover shadow-xl sm:block"
          />
          <div className="absolute -left-4 bottom-8 hidden rounded-3xl bg-gold px-6 py-5 text-ink shadow-[0_16px_40px_-12px_color-mix(in_oklab,var(--gold)_55%,transparent)] sm:block">
            <p className="font-serif text-2xl leading-none">100%</p>
            <p className="mt-1 text-[0.7rem] font-medium">Rigor em cada detalhe.</p>
          </div>
        </div>

        <div>
          <SectionHeading overline="Sobre nós" title="Contabilidade com proximidade e rigor." align="left" />
          <p className="mt-6 text-sm leading-loose text-muted-foreground sm:text-base">
            Somos um gabinete de contabilidade que privilegia a proximidade, o rigor e um acompanhamento adaptado às necessidades de cada cliente. Desenvolvemos a nossa atividade de acordo com os princípios estabelecidos no Estatuto e no Código Deontológico da Ordem dos Contabilistas Certificados.
          </p>
          <p className="mt-5 text-sm leading-loose text-muted-foreground/80 sm:text-base">
            Oferecemos serviços de contabilidade personalizados para empresas e trabalhadores independentes em Portugal, com acompanhamento remoto ou presencial e apoio à gestão que vai além das necessidades legais.
          </p>

          <ul className="mt-9 flex flex-wrap gap-3">
            {valores.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-full border border-gold/20 bg-gold/5 px-4 py-2.5"
              >
                <Icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
                <span className="text-xs text-ink/80">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
