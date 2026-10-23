import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalTable, type LegalSection } from "@/components/site/LegalPage";

const title = "Política de Cookies | AS — Contabilidade, Fiscalidade e Gestão";
const description =
  "Que cookies e armazenamento local utiliza o site da AS | Contabilidade e como os pode gerir.";
const url = "https://as-golden-guidance.lovable.app/politica-de-cookies";

export const Route = createFileRoute("/politica-de-cookies")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  }),
  component: Page,
});

const sections: LegalSection[] = [
  {
    id: "o-que-sao",
    title: "1. O que são cookies",
    body: (
      <p>
        Cookies e tecnologias semelhantes (como o armazenamento local do navegador) são pequenos ficheiros ou registos guardados no seu dispositivo quando visita um site.
      </p>
    ),
  },
  {
    id: "o-que-utilizamos",
    title: "2. O que utilizamos",
    body: (
      <>
        <LegalTable
          head={["Tecnologia", "Finalidade", "Duração", "Categoria"]}
          rows={[
            [
              "Sessão de autenticação (cookie ou armazenamento local do navegador)",
              "Manter o início de sessão seguro na área de clientes",
              "Até terminar sessão ou até expirar",
              "Estritamente necessário",
            ],
          ]}
        />
        <p>Não utilizamos cookies de estatística, de publicidade nem de seguimento.</p>
      </>
    ),
  },
  {
    id: "consentimento",
    title: "3. Consentimento",
    body: (
      <p>
        Os cookies estritamente necessários para fornecer o serviço pedido pelo utilizador, como o início de sessão, não exigem consentimento, nos termos do artigo 5.º da Lei n.º 41/2004, de 18 de agosto. Se no futuro utilizarmos cookies não essenciais, pediremos o seu consentimento prévio e atualizaremos esta política.
      </p>
    ),
  },
  {
    id: "terceiros",
    title: "4. Serviços e ligações de terceiros",
    body: (
      <p>
        O site contém ligações para sites externos (por exemplo, Portal das Finanças, Segurança Social Direta, Ordem dos Contabilistas Certificados e WhatsApp). Esses sites têm as suas próprias políticas de privacidade e de cookies, pelas quais não somos responsáveis.
      </p>
    ),
  },
  {
    id: "gerir",
    title: "5. Como gerir ou eliminar cookies",
    body: (
      <p>
        Pode apagar ou bloquear cookies nas definições do seu navegador. Se bloquear os cookies necessários, não conseguirá iniciar sessão na área de clientes.
      </p>
    ),
  },
  {
    id: "contactos",
    title: "6. Contactos",
    body: <p>Dúvidas sobre esta política: geral@as-contabilidade.pt.</p>,
  },
];

function Page() {
  return <LegalPage title="Política de Cookies" updated="23/10/2026" sections={sections} />;
}
