import { requireAdmin } from "@/lib/admin-guard";
import { friendlyError } from "@/lib/friendly-error";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ChevronDown, Download, FolderOpen, Loader2, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalShell } from "@/components/portal/PortalShell";
import { CategoryPicker } from "@/components/portal/CategoryPicker";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  listClientRecords,
  listClients,
  createClientRecord,
  importClientRecords,
  exportClientRecords,
  createRecordFromAccount,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin_/clientes/")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "Clientes | AS Contabilidade" },
      {
        name: "description",
        content:
          "Base de dados de clientes da AS Contabilidade: fichas, pesquisa, importação e exportação Excel e pastas de submissão.",
      },
      { property: "og:title", content: "Clientes | AS Contabilidade" },
      {
        property: "og:description",
        content: "Área interna para gerir os clientes e as pastas de submissão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientesPage,
  errorComponent: () => (
    <PortalShell title="Clientes">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">
        Não foi possível carregar os clientes. Tente novamente.
      </p>
    </PortalShell>
  ),
  notFoundComponent: () => (
    <PortalShell title="Clientes">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">Página não encontrada.</p>
    </PortalShell>
  ),
});

type Row = {
  id: string;
  user_id: string | null;
  client_number: string;
  name: string;
  nif: string;
  email: string;
  phone: string;
  locality: string;
  folder_active: boolean;
};
type Account = { id: string; full_name: string; nif: string; email: string };
type SortKey = "client_number" | "name" | "nif" | "locality" | "folder_active";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function ClientesPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listClientRecords);
  const fetchAccounts = useServerFn(listClients);
  const importRows = useServerFn(importClientRecords);
  const exportRows = useServerFn(exportClientRecords);
  const fromAccount = useServerFn(createRecordFromAccount);

  const [rows, setRows] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("client_number");
  const [asc, setAsc] = useState(true);
  /** Filtro de estado combinável com a ordenação (por defeito: ativos primeiro). */
  const [stateOrder, setStateOrder] = useState<"active" | "inactive" | "none">("active");
  const [busy, setBusy] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([fetchList(), fetchAccounts().catch(() => [])]);
      setRows(r as unknown as Row[]);
      setAccounts(a as Account[]);
    } catch (e) {
      setError(friendlyError(e, "Erro ao carregar os clientes."));
    }
  }, [fetchList, fetchAccounts]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Conta de acesso associada a cada ficha (pela ligação direta ou pelo NIF). */
  const accountFor = useMemo(() => {
    const byNif = new Map(accounts.filter((a) => a.nif).map((a) => [a.nif.trim(), a.id]));
    return (r: Row) => r.user_id ?? (r.nif ? byNif.get(r.nif.trim()) : undefined) ?? null;
  }, [accounts]);

  const orphanAccounts = useMemo(() => {
    const linked = new Set(rows.map((r) => r.user_id).filter(Boolean));
    const nifs = new Set(rows.map((r) => r.nif.trim()).filter(Boolean));
    return accounts.filter((a) => !linked.has(a.id) && !nifs.has((a.nif ?? "").trim()));
  }, [accounts, rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (!q ||
          [r.name, r.nif, r.client_number, r.locality].some((v) =>
            (v ?? "").toLowerCase().includes(q),
          )),
    );
    const byNumber = (a: Row, b: Row) =>
      String(a.client_number).localeCompare(String(b.client_number), "pt", { numeric: true });
    const dir = asc ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      if (stateOrder !== "none") {
        const st = Number(b.folder_active) - Number(a.folder_active);
        if (st !== 0) return stateOrder === "active" ? st : -st;
      }
      if (sort === "client_number") return dir * byNumber(a, b);
      return dir * String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), "pt");
    });
    return sorted;
  }, [rows, query, sort, asc, stateOrder]);

  const activeCount = rows.filter((r) => r.folder_active).length;

  async function onImport(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = book.SheetNames[0];
      if (!sheetName) throw new Error("O ficheiro não tem folhas de dados.");
      const grid = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName]!, {
        header: 1,
        defval: "",
        raw: false,
      });

      // Encontra a linha de cabeçalhos (a primeira que tenha "NIF" e um nome).
      const headerIdx = grid.findIndex((row) => {
        const cells = (row ?? []).map((c) => norm(String(c)));
        return (
          cells.some((c) => c.startsWith("nif") || c.includes("contribuinte")) &&
          cells.some((c) => c.includes("nome") || c.includes("denominacao") || c === "cliente")
        );
      });
      if (headerIdx < 0)
        throw new Error("Não foi encontrada a linha de cabeçalhos (com NIF e Nome/Denominação).");
      const headers = (grid[headerIdx] ?? []).map((c) => norm(String(c)));

      const col = (tests: ((h: string) => boolean)[]) => {
        for (const t of tests) {
          const i = headers.findIndex(t);
          if (i >= 0) return i;
        }
        return -1;
      };
      const idx = {
        number: col([
          (h) => h === "cli" || h === "n" || h === "no",
          (h) => h.includes("de cliente") || h === "numero" || h === "codigo" || h === "no cliente",
        ]),
        name: col([(h) => h.includes("denominacao"), (h) => h === "nome" || h === "cliente"]),
        nif: col([(h) => h.startsWith("nif") || h.includes("contribuinte")]),
        responsible: col([
          (h) => h.includes("nome contacto") || h.includes("responsavel"),
        ]),
        address: col([(h) => h.includes("morada") || h.includes("endereco postal") || h === "sede"]),
        postal: col([(h) => h.includes("postal") || h === "cp"]),
        locality: col([(h) => h.includes("localidade") || h.includes("cidade")]),
        phone: col([(h) => h.includes("telem") || h.includes("telefone") || h.includes("contacto telef")]),
        email: col([(h) => h.includes("email") || h.includes("e mail")]),
        notes: col([(h) => h.includes("observa") || h.includes("notas")]),
        folder: col([(h) => h.includes("pasta")]),
      };
      if (idx.name < 0) throw new Error("Não foi encontrada a coluna do nome do cliente.");

      const cell = (row: unknown[], i: number) => (i >= 0 ? String(row[i] ?? "").trim() : "");
      const existingNifs = new Set(rows.map((r) => r.nif.trim()).filter(Boolean));
      const seen = new Set<string>();
      let skipped = 0;

      const parsed = grid
        .slice(headerIdx + 1)
        .map((row) => ({
          clientNumber: cell(row, idx.number).slice(0, 30),
          name: cell(row, idx.name).slice(0, 160),
          nif: cell(row, idx.nif).replace(/\s+/g, "").slice(0, 20),
          address: cell(row, idx.address).slice(0, 200),
          postalCode: cell(row, idx.postal).slice(0, 20),
          locality: cell(row, idx.locality).slice(0, 120),
          email: cell(row, idx.email).slice(0, 160),
          phone: cell(row, idx.phone).slice(0, 40),
          responsibleName: cell(row, idx.responsible).slice(0, 120),
          notes: cell(row, idx.notes).slice(0, 4000),
          folderActive: false,
        }))
        .filter((r) => {
          if (r.name.length < 2) return false;
          if (r.nif && (existingNifs.has(r.nif) || seen.has(r.nif))) {
            skipped++;
            return false;
          }
          if (r.nif) seen.add(r.nif);
          return true;
        });

      if (parsed.length === 0)
        throw new Error(
          skipped > 0
            ? "Todos os clientes deste ficheiro já existem (mesmo NIF)."
            : "Não foi encontrada nenhuma linha com nome.",
        );

      let imported = 0;
      for (let i = 0; i < parsed.length; i += 500) {
        const res = (await importRows({ data: { rows: parsed.slice(i, i + 500) } })) as {
          imported: number;
        };
        imported += res.imported;
      }
      setNotice(
        `${imported} cliente(s) importado(s) como inativos — ative-os manualmente para enviar o email de acesso.${skipped ? ` ${skipped} já existiam e foram ignorados.` : ""}`,
      );
      await load();
    } catch (e) {
      setError(friendlyError(e, "Não foi possível importar o ficheiro."));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onExport() {
    setBusy(true);
    setError(null);
    try {
      const data = (await exportRows()) as Record<string, unknown>[];
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(
        data.map((r) => ({
          "Nº Cliente": r["client_number"] ?? "",
          Denominação: r["name"] ?? "",
          "NIF / NIPC": r["nif"] ?? "",
          "Nome Contacto": r["responsible_name"] ?? "",
          "Morada/Sede": r["address"] ?? "",
          "Código Postal": r["postal_code"] ?? "",
          Localidade: r["locality"] ?? "",
          "Nº Telemóvel": r["phone"] ?? "",
          "Endereço de email": r["email"] ?? "",
          Observações: r["notes"] ?? "",
          "Cliente ativo": r["folder_active"] ? "Sim" : "Não",
        })),
      );
      sheet["!cols"] = [8, 40, 14, 24, 36, 12, 18, 16, 30, 40, 11].map((w) => ({ wch: w }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Clientes");
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      XLSX.writeFile(book, `clientes-${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}.xlsx`);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível exportar."));
    } finally {
      setBusy(false);
    }
  }

  async function onAdoptAccount(a: Account) {
    try {
      const row = (await fromAccount({ data: { userId: a.id } })) as { id: string };
      await navigate({ to: "/admin/clientes/$recordId", params: { recordId: row.id } });
    } catch (e) {
      setError(friendlyError(e, "Não foi possível criar a ficha."));
    }
  }

  return (
    <PortalShell
      title="Clientes"
      subtitle={`${rows.length} cliente(s) · ${activeCount} ativo(s)`}
      action={
        <NewRecordDialog
          onImport={() => fileRef.current?.click()}
          importBusy={busy}
          onCreated={(id) => navigate({ to: "/admin/clientes/$recordId", params: { recordId: id } })}
        />
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

      <div className="soft-card mb-6 grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por nome, NIF, nº ou localidade"
              className="w-full rounded-full border border-gold/20 bg-background py-3 pl-11 pr-5 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
            />
          </label>
          <Select
            value={`${sort}:${asc ? "asc" : "desc"}`}
            onValueChange={(value) => {
              const [key, direction] = value.split(":");
              setSort(key as SortKey);
              setAsc(direction === "asc");
            }}
          >
            <SelectTrigger aria-label="Ordenar clientes" className="h-11 w-full min-w-0 shrink-0 rounded-full border-gold/20 bg-background px-5 shadow-none sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name:asc">Nome: A–Z</SelectItem>
              <SelectItem value="name:desc">Nome: Z–A</SelectItem>
              <SelectItem value="client_number:asc">Número interno: crescente</SelectItem>
              <SelectItem value="client_number:desc">Número interno: decrescente</SelectItem>
              <SelectItem value="nif:asc">NIF: crescente</SelectItem>
              <SelectItem value="nif:desc">NIF: decrescente</SelectItem>
              <SelectItem value="locality:asc">Localidade: A–Z</SelectItem>
              <SelectItem value="locality:desc">Localidade: Z–A</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stateOrder} onValueChange={(v) => setStateOrder(v as typeof stateOrder)}>
            <SelectTrigger aria-label="Filtrar por estado" className="h-11 w-full min-w-0 shrink-0 rounded-full border-gold/20 bg-background px-5 shadow-none sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativos primeiro</SelectItem>
              <SelectItem value="inactive">Inativos primeiro</SelectItem>
              <SelectItem value="none">Sem filtro de estado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
            }}
          />
          <Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => setConfirmExport(true)} className="rounded-full border-ink/15 px-4 text-xs shadow-none hover:border-gold hover:bg-transparent hover:text-gold">
            <Download className="h-4 w-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      <section aria-label="Lista de clientes" className="overflow-hidden rounded-3xl border border-gold/20 bg-card">
        <div className="hidden grid-cols-[90px_minmax(0,1fr)_200px_110px] items-center gap-5 border-b border-border px-6 py-4 text-xs font-medium text-muted-foreground md:grid">
          <span>Nº interno</span>
          <span>Nome do cliente</span>
          <span>Documentos</span>
          <span className="text-right">Detalhes</span>
        </div>
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
        ) : visible.map((r) => {
          const account = accountFor(r);
          return (
            <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 border-b border-ink/5 px-5 py-5 transition-colors last:border-0 hover:bg-gold/5 md:grid-cols-[90px_minmax(0,1fr)_200px_110px] md:gap-5 md:px-6">
              <span className="hidden text-sm tabular-nums text-muted-foreground md:block">{r.client_number || "—"}</span>
              <div className="min-w-0">
                <Link to="/admin/clientes/$recordId" params={{ recordId: r.id }} className="block break-words text-base font-medium text-foreground hover:text-gold-deep">{r.name}</Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="md:hidden">Nº interno {r.client_number || "—"} · </span>
                  {r.folder_active ? "Ativo" : "Inativo"}
                </p>
              </div>
              <div className="col-span-2 row-start-2 md:col-span-1 md:row-auto">
                {account ? (
                  <Button asChild className="h-12 w-full justify-start rounded-full bg-gold/15 px-5 text-base text-foreground shadow-none hover:bg-gold/25 md:w-auto">
                    <Link to="/admin/cliente/$clientId" params={{ clientId: account }} aria-label={`Documentos de ${r.name}`}>
                      <FolderOpen className="size-5 text-gold-deep" /> Documentos <ArrowRight className="ml-2 size-4 text-gold-deep" />
                    </Link>
                  </Button>
                ) : (
                  <span className="inline-flex min-h-12 items-center gap-2 text-sm text-muted-foreground"><FolderOpen className="size-5 opacity-50" /> Sem documentos</span>
                )}
              </div>
              <Button asChild variant="ghost" className="col-start-2 row-start-1 h-10 rounded-full px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-gold-deep md:col-auto md:row-auto md:justify-end">
                <Link to="/admin/clientes/$recordId" params={{ recordId: r.id }} aria-label={`Ver tudo de ${r.name}`}>Ver tudo <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          );
        })}
      </section>

      {orphanAccounts.length > 0 ? (
        <div className="soft-card mt-8 p-6">
          <h2 className="font-serif text-lg text-foreground">Contas de acesso sem ficha</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Estas contas entram na área de cliente mas ainda não têm ficha. Crie a ficha para as gerir na lista.
          </p>
          <div className="flex flex-wrap gap-3">
            {orphanAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => void onAdoptAccount(a)}
                className="inline-flex items-center gap-2 rounded-full border border-gold/30 px-4 py-2 text-xs text-foreground hover:border-gold hover:text-gold"
              >
                <Plus className="h-3.5 w-3.5" /> {a.full_name} {a.nif ? `· ${a.nif}` : ""}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmExport}
        icon={<Download className="h-5 w-5" />}
        title="Exportar clientes?"
        message="Tem a certeza que quer exportar a lista de clientes para Excel?"
        confirmLabel="Exportar"
        busy={busy}
        onCancel={() => setConfirmExport(false)}
        onConfirm={() => { setConfirmExport(false); void onExport(); }}
      />
    </PortalShell>
  );
}

function NewRecordDialog({ onCreated, onImport, importBusy }: {
  onCreated: (id: string) => void | Promise<void>;
  onImport: () => void;
  importBusy: boolean;
}) {
  const create = useServerFn(createClientRecord);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    clientNumber: "",
    name: "",
    nif: "",
    responsibleName: "",
    address: "",
    postalCode: "",
    locality: "",
    phone: "",
    email: "",
    notes: "",
    folderActive: true,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const [categories, setCategories] = useState<string[] | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) {
      setError("Indique o nome do cliente.");
      return;
    }
    if (!/^\d{9}$/.test(f.nif.replace(/\s/g, ""))) {
      setError("Indique um NIF / NIPC válido com 9 dígitos.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setError("Indique um email válido.");
      return;
    }
    if (categories !== null && categories.length === 0) {
      setError("Selecione pelo menos uma categoria para este cliente.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = (await create({
        data: { ...f, categories, redirectTo: `${window.location.origin}/definir-password` },
      })) as { id: string; inviteError: string | null };
      if (row.inviteError) window.alert(`Cliente criado, mas o email não foi enviado: ${friendlyError(row.inviteError, "verifique o endereço e tente novamente.")}`);
      setOpen(false);
      await onCreated(row.id);
    } catch (err) {
      setError(friendlyError(err, "Não foi possível criar o cliente."));
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-2xl border border-gold/20 bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold/50";
  const fields: [keyof typeof f, string, string?][] = [
    ["clientNumber", "Nº de cliente"],
    ["name", "Nome / Denominação *"],
    ["nif", "NIF / NIPC *"],
    ["responsibleName", "Nome do contacto"],
    ["address", "Morada / Sede"],
    ["postalCode", "Código postal"],
    ["locality", "Localidade"],
    ["phone", "Telemóvel"],
    ["email", "Email *", "email"],
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" className="h-11 rounded-full bg-gold px-6 text-ink shadow-none hover:bg-gold-deep">
            <Plus className="h-4 w-4" /> Novo cliente <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48 border-gold/20 p-2">
          <DropdownMenuItem onSelect={() => setOpen(true)} className="gap-2 px-3 py-2.5">
            <Plus /> Novo cliente
          </DropdownMenuItem>
          <DropdownMenuItem disabled={importBusy} onSelect={onImport} className="gap-2 px-3 py-2.5">
            <Upload /> Importar Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Novo cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            {fields.map(([k, label, type]) => (
              <label key={k} className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
                <input
                  type={type ?? "text"}
                  value={f[k] as string}
                  onChange={(e) => set(k, e.target.value)}
                  className={input}
                />
              </label>
            ))}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-foreground/80">Observações</span>
              <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} className={input} />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={f.folderActive}
                onChange={(e) => set("folderActive", e.target.checked)}
                className="h-4 w-4 accent-[color:var(--gold)]"
              />
              <span className="text-sm text-foreground">Cliente ativo (recebe email para aceder à área de cliente)</span>
            </label>
            <div className="sm:col-span-2">
              <CategoryPicker value={categories} onChange={setCategories} />
            </div>
            {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink hover:bg-gold-deep disabled:opacity-60 sm:col-span-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar cliente
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
