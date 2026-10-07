import { requireAdmin } from "@/lib/admin-guard";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FolderOpen, Loader2, Mail, Save, Trash2 } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import {
  getClientRecord,
  updateClientRecord,
  deleteClientRecord,
  inviteFromRecord,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin_/clientes/$recordId")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "Ficha de Cliente | AS Contabilidade" },
      {
        name: "description",
        content:
          "Ficha individual de cliente da AS Contabilidade: dados de contacto, responsável, observações e pasta de submissão.",
      },
      { property: "og:title", content: "Ficha de Cliente | AS Contabilidade" },
      {
        property: "og:description",
        content: "Consulta e edição dos dados de um cliente da AS Contabilidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FichaPage,
  errorComponent: () => (
    <PortalShell title="Ficha de Cliente">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">
        Não foi possível carregar esta ficha. Tente novamente.
      </p>
    </PortalShell>
  ),
  notFoundComponent: () => (
    <PortalShell title="Ficha de Cliente">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">Ficha não encontrada.</p>
    </PortalShell>
  ),
});

type Form = {
  clientNumber: string;
  name: string;
  nif: string;
  address: string;
  postalCode: string;
  locality: string;
  email: string;
  phone: string;
  responsibleName: string;
  notes: string;
  folderActive: boolean;
};

const empty: Form = {
  clientNumber: "",
  name: "",
  nif: "",
  address: "",
  postalCode: "",
  locality: "",
  email: "",
  phone: "",
  responsibleName: "",
  notes: "",
  folderActive: false,
};

function FichaPage() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const fetchRecord = useServerFn(getClientRecord);
  const save = useServerFn(updateClientRecord);
  const removeRecord = useServerFn(deleteClientRecord);
  const invite = useServerFn(inviteFromRecord);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = (await fetchRecord({ data: { id: recordId } })) as Record<string, unknown>;
        setUserId((r["user_id"] as string | null) ?? null);
        setForm({
          clientNumber: String(r["client_number"] ?? ""),
          name: String(r["name"] ?? ""),
          nif: String(r["nif"] ?? ""),
          address: String(r["address"] ?? ""),
          postalCode: String(r["postal_code"] ?? ""),
          locality: String(r["locality"] ?? ""),
          email: String(r["email"] ?? ""),
          phone: String(r["phone"] ?? ""),
          responsibleName: String(r["responsible_name"] ?? ""),
          notes: String(r["notes"] ?? ""),
          folderActive: Boolean(r["folder_active"]),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar a ficha.");
      }
    })();
  }, [fetchRecord, recordId]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await save({ data: { id: recordId, ...form } });
      setNotice("Ficha guardada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível guardar a ficha.");
    } finally {
      setBusy(false);
    }
  }

  async function onInvite() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await save({ data: { id: recordId, ...form } });
      const res = (await invite({
        data: { id: recordId, redirectTo: `${window.location.origin}/definir-password` },
      })) as { email: string };
      setNotice(`Acesso criado. Convite enviado para ${res.email}.`);
      setForm((f) => ({ ...f, folderActive: true }));
      const r = (await fetchRecord({ data: { id: recordId } })) as Record<string, unknown>;
      setUserId((r["user_id"] as string | null) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o convite.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setPendingDelete(true);
  }

  async function doDelete() {
    setBusy(true);
    try {
      await removeRecord({ data: { id: recordId } });
      setPendingDelete(false);
      await navigate({ to: "/admin/clientes" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível remover a ficha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      title={form.name || "Ficha de Cliente"}
      subtitle="Dados completos do cliente e estado da pasta de submissão de documentos."
      action={
        <Link
          to="/admin/clientes"
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos clientes
        </Link>
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

      <div className="soft-card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <Field label="Nº de Cliente" value={form.clientNumber} onChange={(v) => set("clientNumber", v)} />
        <Field label="Nome / Designação" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="NIF" value={form.nif} onChange={(v) => set("nif", v)} />
        <Field label="Telefone" value={form.phone} onChange={(v) => set("phone", v)} />
        <Field label="Morada" value={form.address} onChange={(v) => set("address", v)} />
        <Field label="Código Postal" value={form.postalCode} onChange={(v) => set("postalCode", v)} />
        <Field label="Localidade" value={form.locality} onChange={(v) => set("locality", v)} />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
        <Field
          label="Nome do Responsável"
          value={form.responsibleName}
          onChange={(v) => set("responsibleName", v)}
        />
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-xs font-medium text-foreground/80">Observações</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
          />
        </label>

        <div className="sm:col-span-2 rounded-2xl border border-gold/25 bg-gold/5 px-5 py-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.folderActive}
              onChange={(e) => set("folderActive", e.target.checked)}
              className="mt-1 h-4 w-4 accent-[color:var(--gold)]"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Pasta de submissão de documentos ativa
              </span>
              <span className="block text-xs text-muted-foreground">
                Se ativa, o cliente acede às pastas Ano &gt; Mês &gt; Categoria e recebe os emails
                automáticos, incluindo o lembrete do dia 8. Se inativa, a ficha mantém-se registada
                sem pasta nem emails.
              </span>
            </span>
          </label>
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 px-5 py-4">
          <span className="text-sm text-foreground">
            {userId ? "Este cliente já tem acesso à área de cliente." : "Este cliente ainda não tem acesso à área de cliente."}
          </span>
          {userId ? (
            <Link
              to="/admin/cliente/$clientId"
              params={{ clientId: userId }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-5 py-2.5 text-sm text-gold hover:bg-gold/10"
            >
              <FolderOpen className="h-4 w-4" /> Ver documentos
            </Link>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onInvite()}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-5 py-2.5 text-sm text-gold hover:bg-gold/10 disabled:opacity-60"
            >
              <Mail className="h-4 w-4" /> Criar acesso e enviar convite
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSave()}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar ficha
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-sm text-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Remover ficha
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={pendingDelete}
        busy={busy}
        destructive
        icon={<Trash2 className="h-6 w-6" />}
        title="Remover ficha de cliente?"
        message="Tem a certeza que pretende remover esta ficha de cliente? Esta ação não pode ser revertida."
        confirmLabel="Remover"
        onConfirm={() => void doDelete()}
        onCancel={() => {
          if (!busy) setPendingDelete(false);
        }}
      />
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
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
      />
    </label>
  );
}
