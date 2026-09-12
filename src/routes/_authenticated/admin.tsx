import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Plus, UserRound } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  createClient,
  listClients,
  listPendingUnlockRequests,
  decideUnlockRequest,
  listRecentSubmissions,
} from "@/lib/portal.functions";
import { formatDateTimePt, monthLabel } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/admin")({
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

type Client = {
  id: string;
  full_name: string;
  nif: string;
  email: string;
};

function AdminPage() {
  const fetchClients = useServerFn(listClients);
  const addClient = useServerFn(createClient);

  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClients((await fetchClients()) as Client[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar clientes.");
    }
  }, [fetchClients]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await addClient({
        data: {
          fullName,
          nif,
          email,
          redirectTo: `${window.location.origin}/definir-password`,
        },
      });
      setNotice(`Convite enviado para ${email}.`);
      setFullName("");
      setNif("");
      setEmail("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o cliente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      title="Painel de Administração"
      subtitle="Clientes da AS | Contabilidade, Fiscalidade e Gestão."
      action={
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/extratos"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <FileSpreadsheet className="h-4 w-4" /> Conversor de Extratos
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
          >
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>
      }
    >
      {notice ? (
        <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3 text-sm text-foreground">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {open ? (
        <form onSubmit={onSubmit} className="soft-card mb-8 grid gap-4 p-6 sm:grid-cols-3">
          <Field label="Nome completo" value={fullName} onChange={setFullName} />
          <Field label="NIF" value={nif} onChange={setNif} />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar conta e enviar convite
            </button>
          </div>
        </form>
      ) : null}

      <RecentSubmissions />

      <UnlockRequests />

      <h2 className="mb-4 mt-10 font-serif text-2xl text-foreground">Clientes</h2>
      <div className="space-y-3">
        {clients.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gold/30 px-6 py-10 text-center text-sm text-muted-foreground">
            Ainda não existem clientes registados.
          </p>
        ) : (
          clients.map((c) => (
            <Link
              key={c.id}
              to="/admin/cliente/$clientId"
              params={{ clientId: c.id }}
              className="soft-card flex flex-wrap items-center gap-4 px-5 py-4 transition-transform hover:-translate-y-0.5"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <UserRound className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-lg text-foreground">{c.full_name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  NIF {c.nif} · {c.email}
                </span>
              </span>
              <span className="text-xs text-gold">Ver documentos →</span>
            </Link>
          ))
        )}
      </div>
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

  async function act(id: string, decision: "aprovado" | "rejeitado" | "fechado") {
    setBusyId(id);
    try {
      await decide({ data: { id, decision } });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-serif text-2xl text-foreground">Pedidos de desbloqueio</h2>
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
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-foreground/80">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
      />
    </label>
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
    <section className="mt-10">
      <h2 className="mb-4 font-serif text-2xl text-foreground">Submissões Recentes</h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/30 px-6 py-8 text-center text-sm text-muted-foreground">
          Ainda não existem submissões de documentação.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
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
