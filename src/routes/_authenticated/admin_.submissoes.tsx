import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-guard";
import { PortalShell } from "@/components/portal/PortalShell";
import { RecentSubmissions } from "@/components/portal/AdminActivity";

export const Route = createFileRoute("/_authenticated/admin_/submissoes")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [
    { title: "Submissões Recentes — AS Contabilidade" },
    { name: "description", content: "Documentação submetida pelos clientes." },
    { property: "og:title", content: "Submissões Recentes — AS Contabilidade" },
    { property: "og:description", content: "Documentação submetida pelos clientes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <PortalShell title="Submissões Recentes">
    <RecentSubmissions />
  </PortalShell>,
});
