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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const servicos = [
  {
    icon: BookOpen,
    title: "Contabilidade Organizada",
    text: "Apoio à constituição de sociedades, cumprimento de obrigações contabilísticas e fiscais e reporte regular de informação financeira.",
    highlights: ["Constituição e acompanhamento de sociedades", "Obrigações fiscais e contabilísticas", "Informação financeira para apoiar decisões"],
  },
  {
    icon: FileText,
    title: "Regime Simplificado",
    text: "Entrega de declarações, emissão de faturas e recibos verdes, guias de pagamento e análise da evolução do negócio.",
    highlights: ["Apoio a trabalhadores independentes", "Declarações, faturas e recibos verdes", "Acompanhamento da evolução da atividade"],
  },
  {
    icon: Users,
    title: "Salários",
    text: "Gestão de salários e declarações mensais de remunerações para as Finanças e a Segurança Social.",
    highlights: ["Processamento mensal de salários", "Declarações de remunerações", "Apoio nas obrigações laborais correntes"],
  },
  {
    icon: LineChart,
    title: "Projetos IEFP",
    text: "Elaboração de planos de negócio e projetos económico-financeiros para candidaturas a apoios públicos.",
    highlights: ["Estruturação do plano de negócio", "Projeções económico-financeiras", "Preparação da candidatura"],
  },
  {
    icon: Receipt,
    title: "IRS",
    text: "Simulação fiscal, preparação e submissão eletrónica da declaração de IRS.",
    highlights: ["Simulação antes da entrega", "Análise da documentação fiscal", "Preparação e submissão eletrónica"],
  },
  {
    icon: MessageSquare,
    title: "Consultorias",
    text: "Pré-consultoria, consultoria presencial ou remota e resumo escrito enviado por e-mail.",
    highlights: ["Reuniões presenciais ou à distância", "Análise adaptada a cada situação", "Resumo escrito das orientações"],
  },
];

export function Services() {
  return (
    <Section id="servicos" className="relative bg-background">
      <div className="relative">
        <SectionHeading overline="O que fazemos" title="Serviços" />

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.45fr)_minmax(0,0.78fr)] lg:grid-rows-3 lg:items-stretch">
          <div className="group relative min-h-96 overflow-hidden rounded-[2rem] md:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:min-h-[44rem]">
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
            <a href="#contactos" aria-label="Pedir uma proposta" className="absolute inset-0" />
          </div>

          {servicos.map(({ icon: Icon, title, text, highlights }, index) => (
            <Dialog key={title}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className={`soft-card group h-full min-h-52 w-full items-start justify-start whitespace-normal p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/45 hover:bg-card focus-visible:ring-2 focus-visible:ring-gold/50 ${
                    index % 2 === 0 ? "lg:col-start-1" : "lg:col-start-3"
                  } ${index < 2 ? "lg:row-start-1" : index < 4 ? "lg:row-start-2" : "lg:row-start-3"}`}
                >
                  <span className="flex h-full w-full flex-col items-start">
                    <span className="flex w-full items-start justify-between gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-ink">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
                    </span>
                    <span className="mt-5 font-serif text-lg font-medium text-foreground">{title}</span>
                    <span className="mt-2 line-clamp-3 text-sm font-light leading-relaxed text-muted-foreground">{text}</span>
                    <span className="mt-auto pt-4 text-xs font-medium text-gold">Saber mais</span>
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-[2rem] border-gold/20 bg-background p-0 sm:max-w-xl">
                <div className="border-b border-gold/15 bg-secondary px-7 py-8 sm:px-10">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/15 text-gold">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <DialogHeader className="mt-6 text-left">
                    <DialogTitle className="font-serif text-2xl font-medium text-foreground sm:text-3xl">{title}</DialogTitle>
                    <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {text}
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="px-7 py-7 sm:px-10 sm:py-8">
                  <p className="text-xs font-medium uppercase tracking-widest text-gold">Como podemos ajudar</p>
                  <ul className="mt-5 space-y-4">
                    {highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-8 h-11 rounded-full bg-gold px-6 text-ink hover:bg-gold-deep">
                    <a href="#contactos">Pedir informações <ArrowUpRight /></a>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </Section>
  );
}
