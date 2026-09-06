import { createFileRoute } from "@tanstack/react-router";
import { DocumentExplorer } from "@/components/portal/DocumentExplorer";
import { PortalShell } from "@/components/portal/PortalShell";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: DocumentosPage,
  head: () => ({
    meta: [
      { title: "Os Meus Documentos — AS Contabilidade" },
      {
        name: "description",
        content:
          "Área de cliente da AS Contabilidade: envie e consulte os seus documentos contabilísticos organizados por ano, mês e categoria.",
      },
      { property: "og:title", content: "Os Meus Documentos — AS Contabilidade" },
      {
        property: "og:description",
        content: "Envie e consulte os seus documentos contabilísticos em segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DocumentosPage() {
  return (
    <PortalShell
      title="Os Meus Documentos"
      subtitle="Organize e envie os seus documentos por ano, mês e categoria. Apenas ficheiros PDF."
    >
      <DocumentExplorer />
    </PortalShell>
  );
}
