import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ChevronLeft } from "lucide-react";

const title = "Termos e Condições | AS — Contabilidade, Fiscalidade e Gestão";
const description =
  "Termos e condições de utilização dos serviços da AS — Contabilidade, Fiscalidade e Gestão, em Viseu.";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermosPage,
});

const sections = [
  {
    title: "Serviços",
    content:
      "Oferecemos serviços de contabilidade e consultoria para empresas e particulares. Todos os nossos serviços estão sujeitos a contratos ou acordos específicos celebrados entre as partes.",
  },
  {
    title: "Responsabilidade",
    content:
      "Embora nos esforcemos para fornecer informações precisas e fiáveis, não garantimos a precisão completa ou a adequação de qualquer informação fornecida. O utilizador concorda em usar as informações por sua própria conta e risco.",
  },
  {
    title: "Privacidade e Confidencialidade",
    content:
      "Respeitamos a sua privacidade e protegemos informações confidenciais com o máximo cuidado. Consulte a nossa Política de Privacidade para obter informações detalhadas sobre como tratamos os seus dados.",
  },
  {
    title: "Pagamento e Faturação",
    content:
      "Os pagamentos pelos nossos serviços são regidos por acordos específicos. Faturamos de acordo com os termos acordados e concorda em efetuar os pagamentos dentro dos prazos especificados. Os preços são sempre acrescidos de IVA à taxa legal em vigor. Se necessitar que o seu número de contribuinte seja indicado na fatura, é favor indicar aquando do envio do comprovativo de pagamento para o nosso e-mail.",
  },
  {
    title: "Cancelamento e Rescisão",
    content:
      "Os termos de cancelamento e rescisão são estabelecidos nos contratos individuais celebrados entre as partes. O cancelamento de qualquer serviço deve ser notificado conforme especificado no contrato.",
  },
  {
    title: "Propriedade Intelectual",
    content:
      "Todo o conteúdo presente no nosso site, incluindo logótipos, textos e materiais, é de nossa autoria. Concorda em não copiar, reproduzir ou distribuir qualquer conteúdo sem a nossa autorização.",
  },
  {
    title: "Links para Outros Sites",
    content:
      "O site pode conter links para outros sites que não são da nossa propriedade ou por nós controlados. Não somos responsáveis pelo conteúdo desses sites ou por qualquer perda ou dano que possa ser causado pelo uso desses sites.",
  },
  {
    title: "Alterações nos Termos e Condições",
    content:
      "Reservamos o direito de atualizar ou modificar estes termos e condições a qualquer momento. Quaisquer alterações serão publicadas neste site e entram em vigor imediatamente após a publicação. É da sua responsabilidade verificar periodicamente os termos e condições para se manter informado sobre quaisquer atualizações.",
  },
  {
    title: "Contacto",
    content:
      "Se tiver alguma dúvida ou preocupação sobre estes termos e condições, entre em contacto connosco através das informações de contacto fornecidas no nosso site.",
  },
];

function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-36 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-gold/40 hover:text-gold"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao site
          </Link>

          <h1 className="mt-8 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
            Termos e Condições
          </h1>

          <p className="mt-4 text-muted-foreground">
            Bem-vindo à AS | Contabilidade, Fiscalidade e Gestão.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Ao utilizar os nossos serviços, concorda automaticamente em cumprir e aceitar os seguintes termos e condições, além de qualquer legislação aplicável. Se não concordar com qualquer parte destes termos, por favor, não utilize os nossos serviços.
          </p>

          <div className="mt-14 space-y-6">
            {sections.map((s, i) => (
              <section
                key={s.title}
                className="soft-card p-7 transition-all duration-300 hover:border-gold/35"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-serif text-sm font-semibold text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-serif text-xl text-foreground">
                    {s.title}
                  </h2>
                </div>
                <p className="mt-4 leading-relaxed text-muted-foreground">{s.content}</p>
              </section>
            ))}
          </div>

          <p className="mt-12 text-center text-xs text-muted-foreground/60">
            Última atualização: 6 de setembro de 2026.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
