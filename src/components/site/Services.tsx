import { Section, SectionHeading } from "./Section";
import {
  BookOpen,
  FileText,
  Users,
  LineChart,
  Receipt,
  MessageSquare,
} from "lucide-react";

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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden />
      <div className="relative">
        <SectionHeading overline="O que fazemos" title="Serviços" />

        <div className="mt-16 grid grid-cols-1 gap-px border border-gold/15 bg-gold/15 md:grid-cols-2 lg:grid-cols-3">
          {servicos.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="group relative bg-ink p-9 transition-colors duration-500 hover:bg-ink-soft"
            >
              <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-gold to-transparent transition-transform duration-500 group-hover:scale-x-100" aria-hidden />
              <Icon
                className="h-7 w-7 text-gold transition-transform duration-500 group-hover:-translate-y-1"
                strokeWidth={1}
              />
              <h3 className="mt-7 font-serif text-xl text-cream">{title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-cream/60">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

