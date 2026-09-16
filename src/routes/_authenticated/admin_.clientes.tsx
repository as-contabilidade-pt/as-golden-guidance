import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Plus, Search, Upload } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listClientRecords,
  createClientRecord,
  importClientRecords,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin_/clientes")({
  head: () => ({
    meta: [
      { title: "Fichas de Clientes | AS Contabilidade" },
      {
        name: "description",
        content:
          "Base de dados de clientes da AS Contabilidade: fichas completas, pesquisa e gestão das pastas de submissão.",
      },
      { property: "og:title", content: "Fichas de Clientes | AS Contabilidade" },
      {
        property: "og:description",
        content: "Área interna para gerir as fichas de clientes e as pastas de submissão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientesPage,
  errorComponent: () => (
    <PortalShell title="Fichas de Clientes">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">
        Não foi possível carregar as fichas de clientes. Tente novamente.
      </p>
    </PortalShell>
  ),
  notFoundComponent: () => (
    <PortalShell title="Fichas de Clientes">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">Página não encontrada.</p>
    </PortalShell>
  ),
});

type Row = {
  id: string;
  client_number: string;
  name: string;
  nif: string;
  email: string;
  phone: string;
  locality: string;
  folder_active: boolean;
};

type SortKey = "client_number" | "name" | "nif" | "folder_active";

function ClientesPage() {
  const fetchList = useServerFn(listClientRecords);
  const create = useServerFn(createClientRecord);
  const importRows = useServerFn(importClientRecords);

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newNif, setNewNif] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setRows((await fetchList()) as unknown as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar as fichas.");
    }
  }, [fetchList]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) =>
          [r.name, r.nif, r.client_number].some((v) => (v ?? "").toLowerCase().includes(q)),
        )
      : rows;
    const sorted = [...list].sort((a, b) => {
      if (sort === "folder_active") return Number(a.folder_active) - Number(b.folder_active);
      return String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), "pt");
    });
    return asc ? sorted : sorted.reverse();
  }, [rows, query, sort, asc]);

  function toggleSort(key: SortKey) {
    if (key === sort) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(true);
    }
  }

  async function onCreate() {
    if (newName.trim().length < 2) {
      setError("Indique o nome do cliente.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await create({
        data: {
          name: newName.trim(),
          nif: newNif.trim(),
          clientNumber: newNumber.trim(),
          address: "",
          postalCode: "",
          locality: "",
          email: "",
          phone: "",
          responsibleName: "",
          notes: "",
          folderActive: false,
        },
      });
      setNewName("");
      setNewNif("");
      setNewNumber("");
      setNotice("Ficha criada.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a ficha.");
    } finally {
      setBusy(false);
    }
  }

  async function onImport(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = book.SheetNames[0];
      if (!sheetName) throw new Error("O ficheiro não tem folhas de dados.");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[sheetName]!, {
        defval: "",
      });

      const pick = (r: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(r)) {
          const norm = k
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
          if (keys.includes(norm)) return String(r[k] ?? "").trim();
        }
        return "";
      };

      const parsed = raw
        .map((r) => ({
          clientNumber: pick(r, ["no de cliente", "n de cliente", "numero", "no cliente", "codigo"]),
          name: pick(r, ["nome", "designacao", "cliente", "nome/designacao"]),
          nif: pick(r, ["nif", "contribuinte"]),
          address: pick(r, ["morada", "endereco"]),
          postalCode: pick(r, ["codigo postal", "cod postal", "cp"]),
          locality: pick(r, ["localidade", "cidade"]),
          email: pick(r, ["email", "e-mail"]),
          phone: pick(r, ["telefone", "telemovel", "contacto"]),
          responsibleName: pick(r, ["nome do responsavel", "responsavel"]),
          notes: pick(r, ["observacoes", "notas"]),
          folderActive: ["sim", "true", "1", "ativa", "ativo"].includes(
            pick(r, ["pasta ativa", "pasta"]).toLowerCase(),
          ),
        }))
        .filter((r) => r.name.length >= 2);

      if (parsed.length === 0) throw new Error("Não foi encontrada nenhuma linha com nome.");

      const { imported } = (await importRows({ data: { rows: parsed } })) as { imported: number };
      setNotice(`${imported} ficha(s) importada(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível importar o ficheiro.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <PortalShell
      title="Clientes"
      subtitle="Base de dados de fichas de cliente. Pesquise por nome, NIF ou nº de cliente."
      action={
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
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

      <div className="soft-card mb-6 grid gap-4 p-6 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, NIF ou nº de cliente"
            className="w-full rounded-full border border-gold/20 bg-background pl-11 pr-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
          />
        </label>
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
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-sm text-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar Excel/CSV
          </button>
        </div>
      </div>

      <div className="soft-card mb-8 grid gap-4 p-6 sm:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-foreground/80">Nº de cliente</span>
          <input
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm outline-none focus:border-gold/50"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-foreground/80">
            Nome / Designação
          </span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm outline-none focus:border-gold/50"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-foreground/80">NIF</span>
          <input
            value={newNif}
            onChange={(e) => setNewNif(e.target.value)}
            className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm outline-none focus:border-gold/50"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCreate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Adicionar ficha
          </button>
        </div>
      </div>

      <div className="soft-card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-muted-foreground">
              {(
                [
                  ["client_number", "Nº"],
                  ["name", "Nome"],
                  ["nif", "NIF"],
                  ["folder_active", "Pasta ativa"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th key={key} className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="transition-colors hover:text-gold"
                  >
                    {label}
                    {sort === key ? (asc ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  Nenhuma ficha encontrada.
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-5 py-3 text-muted-foreground">{r.client_number || "—"}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.nif || "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        r.folder_active
                          ? "bg-gold/15 text-gold"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {r.folder_active ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to="/admin/clientes/$recordId"
                      params={{ recordId: r.id }}
                      className="text-xs text-gold hover:underline"
                    >
                      Abrir ficha →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
