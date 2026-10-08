import { requireAdmin } from "@/lib/admin-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileSpreadsheet, Inbox, Users } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import {
  listPendingUnlockRequests,
  decideUnlockRequest,
  listRecentSubmissions,
} from "@/lib/portal.functions";
import { formatDateTimePt, monthLabel } from "@/lib/portal";

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
        <a
          href="#desbloqueios"
          className="soft-card flex flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:border-gold/50"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
            <Inbox className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-serif text-xl text-foreground">Pedidos de Desbloqueio</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Aprovar ou rejeitar pedidos de reabertura de meses.
            </span>
          </span>
          <span className="mt-auto text-xs text-gold">Ver abaixo ↓</span>
        </a>
      </div>

      <UnlockRequests />

      <RecentSubmissions />
    </PortalShell>
  );
}

type UnlockRow = {
  id: string;
  full_name: string;
  nif: string;
  year: number;
  month: number;
  reason: string;
  status: "pendente" | "aprovado";
  created_at: string;
};

function UnlockRequests() {
  const fetchRequests = useServerFn(listPendingUnlockRequests);
  const decide = useServerFn(decideUnlockRequest);
  const [rows, setRows] = useState<UnlockRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await fetchRequests()) as unknown as UnlockRow[]);
    } catch {
      /* ignore */
    }
  }, [fetchRequests]);

  useEffect(() => {
    void load();
  }, [load]);

  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    decision: "aprovado" | "rejeitado" | "fechado";
  } | null>(null);

  async function act(id: string, decision: "aprovado" | "rejeitado" | "fechado") {
    setPendingDecision({ id, decision });
  }

  async function doAct() {
    const pending = pendingDecision;
    if (!pending) return;
    setBusyId(pending.id);
    try {
      await decide({ data: { id: pending.id, decision: pending.decision } });
      setPendingDecision(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="desbloqueios" className="mb-10 scroll-mt-24">
      <h2 className="mb-4 font-serif text-2xl text-foreground">Pedidos de desbloqueio</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/30 px-6 py-8 text-center text-sm text-muted-foreground">
          Não existem pedidos de desbloqueio pendentes.
        </p>
      ) : (
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="soft-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-serif text-lg text-foreground">{r.full_name}</span>
              <span className="text-xs text-muted-foreground">NIF {r.nif}</span>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs text-gold">
                {monthLabel(r.month)} {r.year}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.status === "pendente" ? "Pendente" : "Desbloqueada"} ·{" "}
                {formatDateTimePt(r.created_at)}
              </span>
            </div>
            <p className="mt-3 text-sm text-foreground/80">{r.reason}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status === "pendente" ? (
                <>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void act(r.id, "aprovado")}
                    className="rounded-full bg-gold px-5 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void act(r.id, "rejeitado")}
                    className="rounded-full border border-ink/15 px-5 py-2.5 text-xs text-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
                  >
                    Rejeitar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void act(r.id, "fechado")}
                  className="rounded-full border border-ink/15 px-5 py-2.5 text-xs text-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
                >
                  Voltar a bloquear
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      <ConfirmDialog
        open={pendingDecision !== null}
        busy={busyId !== null}
        destructive={pendingDecision?.decision === "rejeitado"}
        icon={<CheckCircle2 className="h-6 w-6" />}
        title={
          pendingDecision?.decision === "aprovado"
            ? "Aprovar pedido?"
            : pendingDecision?.decision === "rejeitado"
              ? "Rejeitar pedido?"
              : "Voltar a bloquear mês?"
        }
        message={
          pendingDecision?.decision === "aprovado"
            ? "Tem a certeza que pretende aprovar este pedido? O mês ficará desbloqueado para o cliente."
            : pendingDecision?.decision === "rejeitado"
              ? "Tem a certeza que pretende rejeitar este pedido?"
              : "Tem a certeza que pretende voltar a bloquear este mês?"
        }
        confirmLabel={
          pendingDecision?.decision === "aprovado"
            ? "Aprovar"
            : pendingDecision?.decision === "rejeitado"
              ? "Rejeitar"
              : "Bloquear"
        }
        onConfirm={() => void doAct()}
        onCancel={() => setPendingDecision(null)}
      />
    </section>
  );
}

type SubmissionRow = {
  id: string;
  full_name: string;
  nif: string;
  year: number;
  month: number;
  submitted_at: string;
  document_count: number;
};

function RecentSubmissions() {
  const fetchRecent = useServerFn(listRecentSubmissions);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [all, setAll] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setRows((await fetchRecent()) as unknown as SubmissionRow[]);
      } catch {
        /* ignore */
      }
    })();
  }, [fetchRecent]);

  return (
    <section id="submissoes" className="mt-10 scroll-mt-24">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-foreground">Submissões Recentes</h2>
        {rows.length > 5 ? (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="text-xs text-gold hover:underline"
          >
            {all ? "Ver menos" : "Ver todas"}
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/30 px-6 py-8 text-center text-sm text-muted-foreground">
          Ainda não existem submissões de documentação.
        </p>
      ) : (
        <div className="space-y-3">
          {(all ? rows : rows.slice(0, 5)).map((r) => (
            <div key={r.id} className="soft-card flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-foreground">
                  {r.full_name} · {monthLabel(r.month)} {r.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  NIF {r.nif} · {r.document_count} documento(s) · submetida em{" "}
                  {formatDateTimePt(r.submitted_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
