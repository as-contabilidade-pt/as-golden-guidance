import { requireAdmin } from "@/lib/admin-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileSpreadsheet, Inbox, Users } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { UnlockRequests } from "@/components/portal/AdminActivity";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: requireAdmin,
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel de Administração — AS Contabilidade" },
      {
        name: "description",
        content:
          "Painel de administração da AS Contabilidade: gerir clientes e consultar os documentos submetidos.",
      },
      { property: "og:title", content: "Painel de Administração — AS Contabilidade" },
      { property: "og:description", content: "Gerir clientes e documentos submetidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const QUICK = [
  {
    to: "/admin/clientes",
    icon: Users,
    title: "Clientes",
    text: "Todos os clientes em grelha, pesquisa e acesso aos documentos.",
  },
  {
    to: "/admin/extratos",
    icon: FileSpreadsheet,
    title: "Conversor de Extratos",
    text: "Converter extratos bancários em PDF para Excel.",
  },
  { to: "/admin/desbloqueios", icon: Inbox, title: "Pedidos de Desbloqueio", text: "Pedidos pendentes e histórico de decisões." },
  { to: "/admin/submissoes", icon: CheckCircle2, title: "Submissões Recentes", text: "Documentação submetida pelos clientes." },
] as const;

function AdminPage() {
  return (
    <PortalShell
      title="Painel de Administração"
      subtitle="Clientes da AS | Contabilidade, Fiscalidade e Gestão."
    >

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="soft-card group flex flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:border-gold/50"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-serif text-xl text-foreground">{title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{text}</span>
            </span>
            <span className="mt-auto text-xs text-gold">Abrir →</span>
          </Link>
        ))}
      </div>

      <UnlockRequests />

    </PortalShell>
  );
}

