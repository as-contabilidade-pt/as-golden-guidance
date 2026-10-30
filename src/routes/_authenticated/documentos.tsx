import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DocumentExplorer } from "@/components/portal/DocumentExplorer";
import { PortalShell } from "@/components/portal/PortalShell";
import { RulesGate, RulesNotice } from "@/components/portal/RulesGate";
import { getMyClientIdentity } from "@/lib/portal.functions";

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
  const fetchIdentity = useServerFn(getMyClientIdentity);
  const [state, setState] = useState<"loading" | "active" | "inactive">("loading");

  useEffect(() => {
    void (async () => {
      try {
        const info = (await fetchIdentity()) as unknown as {
          folderActive: boolean;
          isAdmin: boolean;
        };
        setState(info.folderActive || info.isAdmin ? "active" : "inactive");
      } catch {
        setState("active");
      }
    })();
  }, [fetchIdentity]);

  return (
    <PortalShell
      title="Os Meus Documentos"
      subtitle="Organize e envie os seus documentos por ano, mês e categoria. Apenas ficheiros PDF."
    >
      {state === "loading" ? (
        <p className="soft-card px-6 py-8 text-sm text-muted-foreground">A carregar…</p>
      ) : state === "inactive" ? (
        <div className="soft-card px-6 py-8">
          <p className="font-serif text-xl text-foreground">
            Pasta de submissão de documentos inativa
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            A sua ficha está registada, mas a pasta de submissão de documentos não se encontra
            ativa. Fale connosco para a ativar.
          </p>
        </div>
      ) : (
        <>
          <RulesGate />
          <RulesNotice />
          <DocumentExplorer />
        </>
      )}
    </PortalShell>
  );
}
