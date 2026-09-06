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
    <div className="min-h-screen bg-ink">
      <Header />

      <main className="pt-36 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-cream/60 transition-colors hover:bg-gold/10 hover:text-gold"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao site
          </Link>

          <h1 className="mt-8 font-sans text-4xl font-semibold tracking-tight text-cream md:text-5xl">
            Termos e Condições
          </h1>

          <p className="mt-4 text-cream/60">
            Bem-vindo à AS | Contabilidade, Fiscalidade e Gestão.
          </p>
          <p className="mt-4 leading-relaxed text-cream/70">
            Ao utilizar os nossos serviços, concorda automaticamente em cumprir e aceitar os seguintes termos e condições, além de qualquer legislação aplicável. Se não concordar com qualquer parte destes termos, por favor, não utilize os nossos serviços.
          </p>

          <div className="mt-14 space-y-6">
            {sections.map((s, i) => (
              <section
                key={s.title}
                className="rounded-[1.75rem] border border-gold/10 bg-cream/[0.03] p-7 backdrop-blur-sm transition-colors hover:border-gold/20"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-sans text-sm font-semibold text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-sans text-xl font-semibold text-cream">
                    {s.title}
                  </h2>
                </div>
                <p className="mt-4 leading-relaxed text-cream/70">{s.content}</p>
              </section>
            ))}
          </div>

          <p className="mt-12 text-center text-xs text-cream/40">
            Última atualização: 6 de setembro de 2026.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
