import { requireAdmin } from "@/lib/admin-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DocumentExplorer } from "@/components/portal/DocumentExplorer";
import { PortalShell } from "@/components/portal/PortalShell";
import { getClient } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin_/cliente/$clientId")({
  beforeLoad: requireAdmin,
  component: AdminClientPage,
  head: () => ({
    meta: [
      { title: "Documentos do cliente — AS Contabilidade" },
      {
        name: "description",
        content:
          "Consulta dos documentos submetidos por um cliente da AS Contabilidade, organizados por ano, mês e categoria.",
      },
      { property: "og:title", content: "Documentos do cliente — AS Contabilidade" },
      { property: "og:description", content: "Consulta dos documentos submetidos pelo cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminClientPage() {
  const { clientId } = Route.useParams();
  const fetchClient = useServerFn(getClient);
  const [client, setClient] = useState<{ full_name: string; nif: string; email: string } | null>(
    null,
  );

  useEffect(() => {
    void (async () => {
      try {
        setClient(
          (await fetchClient({ data: { id: clientId } })) as {
            full_name: string;
            nif: string;
            email: string;
          },
        );
      } catch {
        setClient(null);
      }
    })();
  }, [fetchClient, clientId]);

  return (
    <PortalShell
      title={client?.full_name ?? "Cliente"}
      subtitle={client ? `NIF ${client.nif} · ${client.email}` : undefined}
      action={
        <Link
          to="/admin"
          className="rounded-full border border-ink/15 px-5 py-2.5 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
        >
          ← Voltar aos clientes
        </Link>
      }
    >
      <DocumentExplorer clientId={clientId} readOnly />
    </PortalShell>
  );
}
