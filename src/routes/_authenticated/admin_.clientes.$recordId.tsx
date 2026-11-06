import { requireAdmin } from "@/lib/admin-guard";
import { friendlyError } from "@/lib/friendly-error";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowUpRight, FolderOpen, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortalShell } from "@/components/portal/PortalShell";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import { CategoryPicker } from "@/components/portal/CategoryPicker";
import {
  getClientRecord,
  updateClientRecord,
  deleteClientRecord,
  setClientActive,
  getClientDeleteInfo,
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
  categories: string[] | null;
  atSubuser: boolean | null;
  ssSubuser: boolean | null;
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
  categories: null,
  atSubuser: null,
  ssSubuser: null,
};

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  const base = "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background px-4 py-2.5 sm:col-span-2">
      <span className="text-sm text-foreground">
        {label}
        {value === null && <span className="ml-2 text-xs text-destructive">Por validar</span>}
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange(true)} className={`${base} ${value === true ? "border-gold bg-gold text-foreground" : "border-gold/20 text-muted-foreground hover:border-gold/50"}`}>✓ Sim</button>
        <button type="button" onClick={() => onChange(false)} className={`${base} ${value === false ? "border-foreground bg-foreground text-background" : "border-gold/20 text-muted-foreground hover:border-gold/50"}`}>✕ Não</button>
      </div>
    </div>
  );
}

function FichaPage() {
  const { recordId } = Route.useParams();
  const navigate = useNavigate();
  const fetchRecord = useServerFn(getClientRecord);
  const save = useServerFn(updateClientRecord);
  const removeRecord = useServerFn(deleteClientRecord);
  const toggleActive = useServerFn(setClientActive);
  const fetchDeleteInfo = useServerFn(getClientDeleteInfo);
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteStage, setDeleteStage] = useState<"simple" | "warn" | "final">("simple");
  const [deleteInfo, setDeleteInfo] = useState({ documents: 0, submissions: 0 });
  const [pendingToggle, setPendingToggle] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const needsEmail = !form.folderActive && !userId && !form.email.trim();

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
          categories: (r["allowed_categories"] as string[] | null) ?? null,
          atSubuser: (r["at_subuser"] as boolean | null | undefined) ?? null,
          ssSubuser: (r["ss_subuser"] as boolean | null | undefined) ?? null,
        });
      } catch (e) {
        setError(friendlyError(e, "Erro ao carregar a ficha."));
      }
    })();
  }, [fetchRecord, recordId]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const loadedRef = useRef(false);
  const savedRef = useRef<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const snapshot = JSON.stringify(form);
    if (!loadedRef.current) {
      if (form.name) {
        loadedRef.current = true;
        savedRef.current = snapshot;
      }
      return;
    }
    if (snapshot === savedRef.current) return;
    const t = setTimeout(() => void onSave(snapshot), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  async function onSave(snapshot: string) {
    setError(null);
    if (form.name.trim().length < 2) {
      setError("O nome tem de ter pelo menos 2 caracteres.");
      return;
    }
    const nif = form.nif.replace(/\s/g, "");
    if (nif && !/^\d{9}$/.test(nif)) {
      setError("O NIF deve ter 9 dígitos.");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("O email indicado não é válido.");
      return;
    }
    setSaveState("saving");
    try {
      await save({ data: { id: recordId, ...form, nif } });
      savedRef.current = snapshot;
      setSaveState("saved");
    } catch (e) {
      setSaveState("idle");
      setError(friendlyError(e, "Não foi possível guardar a ficha."));
    }
  }

  async function doToggle() {
    if (!form.folderActive && form.categories !== null && form.categories.length === 0) {
      setPendingToggle(false);
      setError("Selecione pelo menos uma pasta antes de ativar o cliente.");
      return;
    }
    const email = needsEmail ? emailInput.trim() : form.email.trim();
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Introduza um email válido.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await toggleActive({ data: {
        id: recordId,
        active: !form.folderActive,
        redirectTo: `${window.location.origin}/definir-password`,
        ...(needsEmail ? { email } : {}),
      } }) as { invited: boolean; email: string };
      setNotice(res.invited ? `Cliente ativado. Email de autenticação enviado para ${res.email}.` : form.folderActive ? "Cliente desativado." : "Cliente ativado.");
      const r = await fetchRecord({ data: { id: recordId } }) as Record<string, unknown>;
      setUserId((r["user_id"] as string | null) ?? null);
      setForm((f) => ({ ...f, folderActive: Boolean(r["folder_active"]), email: String(r["email"] ?? f.email) }));
      setPendingToggle(false);
    } catch (e) {
      setPendingToggle(false);
      setError(friendlyError(e, "Não foi possível alterar o estado do cliente."));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      const info = await fetchDeleteInfo({ data: { id: recordId } }) as { documents: number; submissions: number };
      setDeleteInfo(info);
      setDeleteStage(info.documents > 0 || info.submissions > 0 ? "warn" : "simple");
      setPendingDelete(true);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível verificar o cliente."));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await removeRecord({ data: { id: recordId, force: deleteStage === "final" } });
      setPendingDelete(false);
      await navigate({ to: "/admin/clientes" });
    } catch (e) {
      setError(friendlyError(e, "Não foi possível remover a ficha."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      title={form.name || "Ficha de Cliente"}
      subtitle={`${form.clientNumber ? `Nº interno ${form.clientNumber} · ` : ""}${form.folderActive ? "Cliente ativo" : "Cliente inativo"}`}
      action={
        <Link
          to="/admin/clientes"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs bg-gold text-ink font-medium transition-colors hover:bg-gold-deep"
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

      {userId ? (
        <Button asChild variant="ghost" className="group mb-6 grid h-auto min-h-28 w-full grid-cols-[24px_minmax(0,1fr)_24px] gap-3 whitespace-normal rounded-3xl bg-ink px-5 py-6 text-background transition-colors hover:bg-ink/90 hover:text-background focus-visible:ring-2 focus-visible:ring-gold sm:grid-cols-[48px_minmax(0,1fr)_48px] sm:px-7">
          <Link to="/admin/cliente/$clientId" params={{ clientId: userId }} aria-label={`Abrir documentos de ${form.name}`}>
            <FolderOpen className="size-5 justify-self-center text-gold" />
            <span className="min-w-0 text-center">
              <span className="block text-lg font-medium">Documentos do cliente</span>
              <span className="mt-1 block text-sm font-normal text-background/65">Consultar e descarregar o arquivo</span>
            </span>
            <ArrowUpRight className="size-5 justify-self-center text-gold transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </Link>
        </Button>
      ) : (
        <section aria-label="Documentos do cliente" className="mb-6 rounded-3xl bg-ink px-5 py-6 text-center text-background">
          <h2 className="text-lg font-medium">Documentos do cliente</h2>
          <p className="mt-1 text-sm text-background/65">Disponível depois de ativar o cliente.</p>
        </section>
      )}

      <form onSubmit={(event) => event.preventDefault()} className="rounded-3xl border border-gold/15 bg-card shadow-sm">
        <Tabs defaultValue="dados">
          <div className="border-b border-gold/10 px-5 pt-5 sm:px-7">
            <TabsList className="h-auto w-fit max-w-full gap-6 rounded-none bg-transparent p-0">
              <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-sm text-muted-foreground shadow-none data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">Dados do cliente</TabsTrigger>
              <TabsTrigger value="acesso" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-sm text-muted-foreground shadow-none data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">Acesso e pastas</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="dados" className="mt-0 space-y-6 px-5 py-6 sm:px-7">
            <Group title="Identificação">
              <Field label="Número interno" value={form.clientNumber} onChange={(v) => set("clientNumber", v)} />
              <Field label="Nome / Designação" value={form.name} onChange={(v) => set("name", v)} />
              <Field label="NIF" value={form.nif} onChange={(v) => set("nif", v)} />
            </Group>
            <Group title="Contacto">
              <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
              <Field label="Telefone" value={form.phone} onChange={(v) => set("phone", v)} />
              <Field label="Responsável" value={form.responsibleName} onChange={(v) => set("responsibleName", v)} />
            </Group>
            <Group title="Morada">
              <Field label="Morada" value={form.address} onChange={(v) => set("address", v)} />
              <Field label="Código postal" value={form.postalCode} onChange={(v) => set("postalCode", v)} />
              <Field label="Localidade" value={form.locality} onChange={(v) => set("locality", v)} />
            </Group>
            <Group title="Validação de registo">
              <YesNo label="Subutilizador criado na AT" value={form.atSubuser} onChange={(v) => set("atSubuser", v)} />
              <YesNo label="Subutilizador criado na Segurança Social" value={form.ssSubuser} onChange={(v) => set("ssSubuser", v)} />
            </Group>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-gold-deep">Observações internas</span>
              <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Visível apenas para a administração" className="w-full rounded-2xl border border-gold/15 bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-gold/50" />
            </label>
          </TabsContent>
          <TabsContent value="acesso" className="mt-0 space-y-6 px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-3 rounded-2xl bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className={`size-2.5 shrink-0 rounded-full ${form.folderActive ? "bg-gold" : "bg-muted-foreground/40"}`} />
                <div>
                  <h3 className="text-sm font-medium">{form.folderActive ? "Cliente ativo" : "Cliente inativo"}</h3>
                  <p className="text-xs text-muted-foreground">{form.folderActive ? "Com acesso ao portal e emails automáticos." : "Registado, sem acesso ao portal nem emails automáticos."}</p>
                </div>
              </div>
              <Button type="button" variant="outline" disabled={busy} onClick={() => { setEmailInput(""); setEmailError(null); setPendingToggle(true); }} className="h-10 rounded-full px-5 text-sm">
                {form.folderActive ? "Desativar" : "Ativar cliente"}
              </Button>
            </div>
            <CategoryPicker value={form.categories} onChange={(v) => set("categories", v)} />
          </TabsContent>
        </Tabs>
        <div className="flex flex-col-reverse gap-3 border-t border-gold/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void onDelete()} className="rounded-full text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="size-4" /> Apagar cliente
          </Button>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            {saveState === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saveState === "saving" ? "A guardar…" : saveState === "saved" ? "Alterações guardadas automaticamente" : "As alterações são guardadas automaticamente"}
          </span>
        </div>
      </form>
      <ConfirmDialog
        open={pendingToggle}
        busy={busy}
        destructive={form.folderActive}
        title={form.folderActive ? "Desativar cliente?" : "Ativar cliente?"}
        message={form.folderActive
          ? `Tem a certeza que pretende desativar ${form.name}? Deixa de ter acesso à área de cliente.`
          : needsEmail
            ? "Introduza o email do cliente. Será enviado um email para autenticar e definir a palavra-passe."
            : !userId
              ? `Será enviado um email para ${form.email} para autenticar e definir a palavra-passe. Confirma a ativação?`
              : `Tem a certeza que pretende ativar ${form.name}? Volta a ter acesso à área de cliente.`}
        details={needsEmail ? <label className="block text-left text-sm">Email do cliente<input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="mt-2 w-full rounded-2xl border border-gold/30 bg-card px-4 py-3 outline-none focus:border-gold" />{emailError ? <span className="mt-2 block text-xs text-destructive">{emailError}</span> : null}</label> : null}
        confirmLabel={form.folderActive ? "Desativar" : "Ativar cliente"}
        onConfirm={() => void doToggle()}
        onCancel={() => { if (!busy) setPendingToggle(false); }}
      />
      <ConfirmDialog
        open={pendingDelete}
        busy={busy}
        destructive
        icon={<Trash2 className="size-6" />}
        title={deleteStage === "final" ? "Eliminação definitiva" : deleteStage === "warn" ? "Cliente com documentos" : "Apagar cliente?"}
        message={deleteStage === "final"
          ? `Vai apagar definitivamente ${form.name}, o acesso à área de cliente e todos os documentos e submissões. Esta ação não pode ser revertida. Confirma?`
          : deleteStage === "warn"
            ? `${form.name} tem ${deleteInfo.documents} documento(s) e ${deleteInfo.submissions} submissão(ões). Recomenda-se desativar o cliente para preservar o arquivo, em vez de o apagar.`
            : `Tem a certeza que pretende apagar ${form.name}? A ficha e o eventual acesso ao portal serão eliminados definitivamente.`}
        confirmLabel={deleteStage === "warn" ? "Apagar mesmo assim" : deleteStage === "final" ? "Apagar tudo" : "Apagar"}
        cancelLabel={deleteStage === "warn" ? "Manter cliente" : "Cancelar"}
        onConfirm={() => { if (deleteStage === "warn") setDeleteStage("final"); else void doDelete(); }}
        onCancel={() => { if (!busy) setPendingDelete(false); }}
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
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gold/15 bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
      />
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gold-deep">{title}</legend>
      <div className="grid gap-x-5 gap-y-4 md:grid-cols-3">{children}</div>
    </fieldset>
  );
}
