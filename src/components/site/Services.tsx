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
      <div className="relative">
        <SectionHeading overline="O que fazemos" title="Serviços" />

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servicos.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="soft-card group p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/45"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-ink">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-6 font-serif text-xl text-cream">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/60">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
