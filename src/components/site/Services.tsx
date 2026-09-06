import { Section, SectionHeading } from "./Section";
import {
  BookOpen,
  FileText,
  Users,
  LineChart,
  Receipt,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import servicesImage from "@/assets/services-detail.jpg";

const servicos = [
  {
    icon: BookOpen,
    title: "Contabilidade Organizada",
    text: "Apoio à constituição de sociedades, cumprimento de obrigações contabilísticas e fiscais e reporte regular de informação financeira.",
  },
  {
    icon: FileText,
    title: "Regime Simplificado",
    text: "Entrega de declarações, emissão de faturas e recibos verdes, guias de pagamento e análise da evolução do negócio.",
  },
  {
    icon: Users,
    title: "Salários",
    text: "Gestão de salários e declarações mensais de remunerações para as Finanças e a Segurança Social.",
  },
  {
    icon: LineChart,
    title: "Projetos IEFP",
    text: "Elaboração de planos de negócio e projetos económico-financeiros para candidaturas a apoios públicos.",
  },
  {
    icon: Receipt,
    title: "IRS",
    text: "Simulação fiscal, preparação e submissão eletrónica da declaração de IRS.",
  },
  {
    icon: MessageSquare,
    title: "Consultorias",
    text: "Pré-consultoria, consultoria presencial ou remota e resumo escrito enviado por e-mail.",
  },
];

export function Services() {
  return (
    <Section id="servicos" className="relative bg-ink">
      <div className="relative">
        <SectionHeading overline="O que fazemos" title="Serviços" />

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <a
            href="#contactos"
            className="group relative block min-h-80 overflow-hidden rounded-[2rem] md:col-span-2 lg:row-span-2 lg:min-h-full"
          >
            <img
              src={servicesImage}
              alt="Mãos a rever documentos financeiros com caneta dourada e gráficos no computador"
              width={1280}
              height={960}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10" />
            <div className="relative flex h-full flex-col justify-end p-8 sm:p-10">
              <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 bg-ink/60 px-4 py-1.5 text-[0.7rem] tracking-wider-caps text-gold backdrop-blur">
                Acompanhamento próximo
              </span>
              <h3 className="max-w-md font-serif text-2xl text-cream sm:text-3xl">
                Cada negócio é único. Cada plano, também.
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-cream/70">
                Fale connosco e descubra qual o acompanhamento certo para a sua empresa
                ou atividade independente.
              </p>
              <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-medium text-ink transition-transform duration-300 group-hover:translate-x-1">
                Pedir proposta
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </div>
          </a>

          {servicos.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="soft-card group relative p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/45"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-ink">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-gold/0 transition-all duration-300 group-hover:text-gold"
                  strokeWidth={2}
                />
              </div>
              <h3 className="mt-6 font-serif text-xl text-cream">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/60">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
