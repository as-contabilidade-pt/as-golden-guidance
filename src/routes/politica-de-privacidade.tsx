import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalTable, type LegalSection } from "@/components/site/LegalPage";

const title = "Política de Privacidade | AS — Contabilidade, Fiscalidade e Gestão";
const description =
  "Como a AS | Contabilidade trata os dados pessoais recolhidos no site e no portal de clientes.";
const url = "https://as-golden-guidance.lovable.app/politica-de-privacidade";

export const Route = createFileRoute("/politica-de-privacidade")({
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
    id: "responsavel",
    title: "1. Responsável pelo tratamento",
    body: (
      <>
        <p>
          ANDREIA SOFIA &amp; RUBEN DUARTE - CONTABILIDADE, FISCALIDADE E GESTÃO, LDA, NIPC 517948966, com sede na Av. José Gonçalves Pais, nº 21, 3515-146 Viseu ("AS | Contabilidade", "nós"), é a entidade responsável pelo tratamento dos dados pessoais recolhidos neste site e no portal de clientes.
        </p>
        <p>Contactos: geral@as-contabilidade.pt | 965 378 291.</p>
      </>
    ),
  },
  {
    id: "dados",
    title: "2. Que dados tratamos, para que fins e com que fundamento",
    body: (
      <LegalTable
        head={["Finalidade", "Dados", "Fundamento", "Conservação"]}
        rows={[
          [
            "Resposta a pedidos de contacto (formulário do site)",
            "nome, apelido, email e mensagem.",
            "diligências pré-contratuais e interesse legítimo em responder ao pedido.",
            "12 meses após o último contacto.",
          ],
          [
            "Gestão da relação com clientes e criação da conta no portal",
            "nome ou designação, NIF, morada, email, telefone, nome do responsável e número de cliente.",
            "execução do contrato de prestação de serviços.",
            "durante o contrato e, depois, pelos prazos legais aplicáveis.",
          ],
          [
            "Receção e tratamento da documentação contabilística no portal",
            "documentos em PDF submetidos pelo cliente (faturas, extratos bancários, documentos de salários e outros), que podem conter dados pessoais do cliente e de terceiros.",
            "execução do contrato e cumprimento de obrigações legais contabilísticas e fiscais.",
            "No portal, em regra 12 meses, sendo depois eliminados pela administração após arquivo; no arquivo contabilístico, pelo prazo legal aplicável (em regra, 10 anos).",
          ],
          [
            "Conversão de extratos bancários (ferramenta interna da administração)",
            "movimentos extraídos dos extratos (data, descrição, débito, crédito e saldo), nome do cliente e nome do ficheiro",
            "execução do contrato",
            "30 dias, sendo depois eliminados automaticamente",
          ],
          [
            "Registo de submissões, declarações e pedidos de reabertura de períodos",
            "identificação do cliente, período, data e hora, texto da declaração aceite e motivo invocado.",
            "execução do contrato e interesse legítimo em comprovar o cumprimento de prazos e declarações.",
            "durante a relação contratual e pelo prazo legal aplicável.",
          ],
          [
            "Envio de emails de serviço (convites, recuperação de palavra-passe, lembretes de prazo e confirmações)",
            "nome e email.",
            "execução do contrato.",
            "durante a relação contratual.",
          ],
          [
            "Segurança e funcionamento do site",
            "dados técnicos de ligação, tratados pelos prestadores de alojamento e autenticação.",
            "interesse legítimo na segurança e disponibilidade do serviço.",
            "pelo período mínimo necessário, definido pelos prestadores.",
          ],
        ]}
      />
    ),
  },
  {
    id: "terceiros",
    title: "3. Dados de terceiros nos documentos",
    body: (
      <p>
        Os documentos submetidos pelos clientes podem conter dados pessoais de terceiros (por exemplo, trabalhadores, fornecedores ou clientes do cliente). O cliente é responsável por garantir que tem legitimidade para os submeter. Tratamos esses dados apenas para a prestação dos serviços de contabilidade contratados.
      </p>
    ),
  },
  {
    id: "partilha",
    title: "4. Com quem partilhamos os dados",
    body: (
      <>
        <p>
          Recorremos a prestadores de serviços que tratam dados em nosso nome, ao abrigo de contratos ou termos que cumprem o RGPD:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: base de dados, autenticação e armazenamento de ficheiros (infraestrutura na União Europeia, região de Estocolmo).</li>
          <li>Vercel: alojamento do site.</li>
          <li>Resend: envio de emails de serviço.</li>
          <li>Anthropic: tratamento dos extratos bancários na ferramenta de conversão, através de interface comercial, ao abrigo de termos que excluem a utilização dos dados para treino de modelos e de um acordo de tratamento de dados.</li>
        </ul>
        <p>
          Podemos ainda comunicar dados a autoridades públicas (Autoridade Tributária, Segurança Social, tribunais) quando a lei o exigir. Não vendemos dados pessoais nem os utilizamos para publicidade.
        </p>
        <p>
          O botão de WhatsApp do site abre uma conversa através do WhatsApp (Meta), que trata os dados segundo a sua própria política de privacidade.
        </p>
      </>
    ),
  },
  {
    id: "transferencias",
    title: "5. Transferências para fora do Espaço Económico Europeu",
    body: (
      <p>
        Alguns prestadores podem tratar dados fora do EEE. Nesses casos, a transferência assenta em garantias adequadas, quando aplicável, como cláusulas contratuais-tipo aprovadas pela Comissão Europeia ou o Quadro de Privacidade de Dados UE-EUA. Isto inclui o prestador de inteligência artificial, que pode tratar dados fora do EEE ao abrigo de cláusulas contratuais-tipo.
      </p>
    ),
  },
  {
    id: "seguranca",
    title: "6. Segurança",
    body: (
      <p>
        Adotamos medidas técnicas e organizativas adequadas, incluindo ligações cifradas (HTTPS), contas individuais com controlo de acessos (cada cliente só acede aos seus documentos), armazenamento privado de ficheiros e restrição do acesso administrativo.
      </p>
    ),
  },
  {
    id: "direitos",
    title: "7. Os seus direitos",
    body: (
      <p>
        Pode exercer, a qualquer momento, os direitos de acesso, retificação, apagamento, limitação do tratamento, portabilidade e oposição, bem como retirar o consentimento quando o tratamento nele se baseie, através de geral@as-contabilidade.pt. Alguns dados têm de ser conservados por imposição legal, o que pode limitar o apagamento.
      </p>
    ),
  },
  {
    id: "reclamacoes",
    title: "8. Reclamações",
    body: (
      <p>
        Tem o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD),{" "}
        <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-gold underline">www.cnpd.pt</a>. Pode também usar o Livro de Reclamações Eletrónico (
        <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer" className="text-gold underline">www.livroreclamacoes.pt</a>).
      </p>
    ),
  },
  {
    id: "decisoes",
    title: "9. Decisões automatizadas",
    body: (
      <p>
        Não tomamos decisões exclusivamente automatizadas, nem fazemos definição de perfis, com efeitos sobre os titulares dos dados.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "10. Alterações",
    body: <p>Podemos atualizar esta política. A data da última atualização consta no topo da página.</p>,
  },
];

function Page() {
  return <LegalPage title="Política de Privacidade" updated="23/10/2026" sections={sections} />;
}
