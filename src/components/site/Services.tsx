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
      <div className="linen-pattern absolute inset-0 opacity-40" aria-hidden />
      <div className="relative">
        <SectionHeading overline="O que fazemos" title="Serviços" />

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servicos.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="group border border-gold/25 bg-ink-soft/60 p-8 transition-colors duration-300 hover:border-gold/70"
            >
              <Icon className="h-8 w-8 text-gold" strokeWidth={1} />
              <h3 className="mt-6 font-serif text-xl text-cream">{title}</h3>
              <div className="gold-rule mt-4 w-12" />
              <p className="mt-4 text-sm leading-relaxed text-cream/65">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
