import { requireAdmin } from "@/lib/admin-guard";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin_/definicoes/categorias")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "Categorias de Documentos | AS Contabilidade" },
      {
        name: "description",
        content:
          "Gestão das categorias de documentos do portal de clientes da AS Contabilidade, Fiscalidade e Gestão.",
      },
      { property: "og:title", content: "Categorias de Documentos | AS Contabilidade" },
      {
        property: "og:description",
        content: "Área interna para gerir as categorias de documentos do portal de clientes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesPage,
  errorComponent: () => (
    <PortalShell title="Categorias de Documentos">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">
        Não foi possível carregar as categorias. Tente novamente.
      </p>
    </PortalShell>
  ),
  notFoundComponent: () => (
    <PortalShell title="Categorias de Documentos">
      <p className="soft-card px-6 py-8 text-sm text-muted-foreground">Página não encontrada.</p>
    </PortalShell>
  ),
});

type Category = { id: string; slug: string; label: string; position: number };

function CategoriesPage() {
  const fetchList = useServerFn(listCategories);
  const create = useServerFn(createCategory);
  const update = useServerFn(updateCategory);
  const removeCategory = useServerFn(deleteCategory);

  const [items, setItems] = useState<Category[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = (await fetchList({ data: { all: true } })) as unknown as Category[];
      setItems(rows);
      setLabels(Object.fromEntries(rows.map((r) => [r.id, r.label])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar categorias.");
    }
  }, [fetchList]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, message: string) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      title="Categorias de Documentos"
      subtitle="Defina as pastas que os clientes vêem dentro de cada mês."
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

      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className="soft-card flex flex-wrap items-center gap-3 px-5 py-4">
            <input
              type="text"
              value={labels[c.id] ?? ""}
              onChange={(e) => setLabels((prev) => ({ ...prev, [c.id]: e.target.value }))}
              className="min-w-0 flex-1 rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
            />
            <button
              type="button"
              disabled={busy || (labels[c.id] ?? "").trim().length < 2}
              onClick={() =>
                void run(
                  () => update({ data: { id: c.id, label: (labels[c.id] ?? "").trim() } }),
                  "Categoria atualizada.",
                )
              }
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Guardar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => removeCategory({ data: { id: c.id } }), "Categoria removida.")}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-5 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          </div>
        ))}
      </div>

      <div className="soft-card mt-6 flex flex-wrap items-center gap-3 px-5 py-4">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nome da nova categoria"
          className="min-w-0 flex-1 rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
        />
        <button
          type="button"
          disabled={busy || newLabel.trim().length < 2}
          onClick={() =>
            void run(async () => {
              await create({ data: { label: newLabel.trim() } });
              setNewLabel("");
            }, "Categoria adicionada.")
          }
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Só é possível remover categorias sem documentos associados, para preservar o histórico.
      </p>
    </PortalShell>
  );
}
