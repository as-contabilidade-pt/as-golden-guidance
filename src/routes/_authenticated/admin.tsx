import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, UserRound } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { createClient, listClients } from "@/lib/portal.functions";

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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
        >
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
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
