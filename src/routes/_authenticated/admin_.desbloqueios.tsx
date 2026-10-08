import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-guard";
import { PortalShell } from "@/components/portal/PortalShell";
import { UnlockRequests } from "@/components/portal/AdminActivity";

export const Route = createFileRoute("/_authenticated/admin_/desbloqueios")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [
    { title: "Pedidos de Desbloqueio — AS Contabilidade" },
    { name: "description", content: "Pedidos de reabertura e histórico de decisões." },
    { property: "og:title", content: "Pedidos de Desbloqueio — AS Contabilidade" },
    { property: "og:description", content: "Pedidos de reabertura e histórico de decisões." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <PortalShell title="Pedidos de Desbloqueio" action={<Link to="/admin" className="text-sm text-gold hover:underline">← Voltar ao painel</Link>}>
    <UnlockRequests history />
  </PortalShell>,
});
