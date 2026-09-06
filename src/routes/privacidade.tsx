import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ChevronLeft } from "lucide-react";

const title = "Política de Privacidade | AS — Contabilidade, Fiscalidade e Gestão";
const description =
  "Política de privacidade e proteção de dados da AS — Contabilidade, Fiscalidade e Gestão, em Viseu.";

export const Route = createFileRoute("/privacidade")({
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
  component: PrivacidadePage,
});

const sections = [
  {
    title: "Responsabilidade pela Proteção de Dados",
    content:
      "Andreia Sofia é a responsável pela recolha e tratamento dos seus dados pessoais, estando empenhada em utilizar esses dados de forma responsável e de acordo com as leis de proteção de dados aplicáveis.",
  },
  {
    title: "Recolha e Utilização de Dados",
    content:
      "Recolhemos informações pessoais, como nome, morada, endereços de e-mail, números de contacto e documentos de identificação civil e fiscal, apenas quando estritamente necessário para fornecer os nossos serviços contabilísticos. Utilizamos esses dados para cumprir as obrigações legais e para melhorar a qualidade dos nossos serviços.",
  },
  {
    title: "Proteção de Dados",
    content:
      "A sua segurança é a nossa prioridade. Implementamos medidas de segurança técnicas e organizacionais para proteger os seus dados contra acesso não autorizado, perda, roubo ou alteração não autorizada.",
  },
  {
    title: "Partilha de Informações",
    content:
      "Não partilhamos as suas informações de identificação pessoal publicamente ou com terceiros, exceto quando necessário por lei ou quando solicitado por entidades públicas autorizadas.",
  },
  {
    title: "Direitos dos Titulares de Dados Pessoais",
    content:
      "Tem o direito de aceder, corrigir, atualizar ou eliminar os seus dados pessoais a qualquer momento. Também pode retirar o seu consentimento para o processamento dos seus dados ou opor-se ao seu tratamento. Para exercer esses direitos, entre em contacto connosco através das informações de contacto fornecidas no nosso site.",
  },
  {
    title: "Conservação de Dados",
    content:
      "Conservamos os seus dados pessoais apenas pelo período mínimo necessário para cumprir as finalidades para as quais foram recolhidos, de acordo com as obrigações legais aplicáveis.",
  },
  {
    title: "Alterações na Política de Privacidade",
    content:
      "Reservamo-nos o direito de atualizar esta Política de Privacidade conforme necessário para refletir mudanças nas leis de proteção de dados e nas nossas práticas. Quaisquer alterações serão publicadas no nosso site.",
  },
];

function PrivacidadePage() {
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
            Política de Privacidade
          </h1>

          <p className="mt-4 text-lg text-gold">A sua privacidade é importante para nós.</p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            A AS | Contabilidade, Fiscalidade e Gestão, especializada em serviços de contabilidade, valoriza a confiança que deposita em nós e está comprometida em proteger a privacidade dos seus dados pessoais. Esta Política de Privacidade explica como recolhemos, usamos e protegemos as suas informações pessoais.
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

          <div className="mt-14 rounded-[1.75rem] border border-gold/25 bg-gold/10 p-8 text-center">
            <p className="leading-relaxed text-ink/80">
              Agradecemos por escolher a AS | Contabilidade, Fiscalidade e Gestão como o seu parceiro de confiança em serviços de contabilidade. A sua privacidade é importante para nós, e estamos aqui para garantir que os seus dados pessoais sejam tratados com o máximo cuidado e respeito.
            </p>
            <p className="mt-4 text-sm text-ink/60">
              Se tiver alguma dúvida ou preocupação sobre a nossa política de privacidade ou o tratamento dos seus dados, não hesite em contactar-nos. Estamos à sua disposição para esclarecer todas as suas questões.
            </p>
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
