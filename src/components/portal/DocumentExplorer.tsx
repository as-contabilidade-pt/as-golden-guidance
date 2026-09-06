import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  MONTHS,
  availableYears,
  categoryLabel,
  monthLabel,
  type CategorySlug,
} from "@/lib/portal";
import {
  confirmDocument,
  countsForYear,
  deleteDocument,
  getDownloadUrl,
  listDocuments,
  reserveDocument,
} from "@/lib/portal.functions";

type Doc = {
  id: string;
  label: string;
  original_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
};

export function DocumentExplorer({
  clientId,
  readOnly = false,
}: {
  clientId?: string;
  readOnly?: boolean;
}) {
  const years = availableYears();
  const [year, setYear] = useState(years[0]!);
  const [month, setMonth] = useState<number | null>(null);
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchCounts = useServerFn(countsForYear);
  const fetchDocs = useServerFn(listDocuments);
  const reserve = useServerFn(reserveDocument);
  const confirm = useServerFn(confirmDocument);
  const remove = useServerFn(deleteDocument);
  const download = useServerFn(getDownloadUrl);

  const loadCounts = useCallback(async () => {
    try {
      setCounts(await fetchCounts({ data: { year, ...(clientId ? { clientId } : {}) } }));
    } catch {
      /* ignore */
    }
  }, [fetchCounts, year, clientId]);

  const loadDocs = useCallback(async () => {
    if (month === null || category === null) return;
    setLoading(true);
    try {
      setDocs(
        (await fetchDocs({
          data: { year, month, category, ...(clientId ? { clientId } : {}) },
        })) as Doc[],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar documentos.");
    } finally {
      setLoading(false);
    }
  }, [fetchDocs, year, month, category, clientId]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  async function handleFiles(files: FileList | null) {
    if (!files || month === null || category === null) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(`"${file.name}" não é um PDF. Apenas são aceites ficheiros PDF.`);
        }
        const reserved = (await reserve({
          data: {
            year,
            month,
            category,
            originalName: file.name,
            ...(clientId ? { clientId } : {}),
          },
        })) as { id: string; storage_path: string };

        const { error: uploadError } = await supabase.storage
          .from("documentos")
          .upload(reserved.storage_path, file, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (uploadError) {
          await remove({ data: { id: reserved.id } });
          throw new Error(uploadError.message);
        }
        await confirm({ data: { id: reserved.id, sizeBytes: file.size } });
      }
      await loadDocs();
      await loadCounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar o documento.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(id: string) {
    try {
      const { url } = (await download({ data: { id } })) as { url: string };
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao abrir o documento.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover este documento?")) return;
    setBusy(true);
    try {
      await remove({ data: { id } });
      await loadDocs();
      await loadCounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover o documento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setMonth(null);
            setCategory(null);
          }}
          className="rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:text-gold"
        >
          {year}
        </button>
        {month !== null ? (
          <>
            <ChevronRight className="h-4 w-4 text-gold/60" />
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:text-gold"
            >
              {monthLabel(month)}
            </button>
          </>
        ) : null}
        {category !== null ? (
          <>
            <ChevronRight className="h-4 w-4 text-gold/60" />
            <span className="rounded-full bg-gold/15 px-4 py-1.5 text-xs font-medium text-gold">
              {categoryLabel(category)}
            </span>
          </>
        ) : null}
      </div>

      {month === null ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`rounded-full px-5 py-2 text-xs font-medium transition-colors ${
                y === year
                  ? "bg-gold text-ink"
                  : "border border-ink/15 text-foreground hover:border-gold hover:text-gold"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        {month === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MONTHS.map((name, i) => (
              <FolderCard
                key={name}
                title={name}
                meta={`${counts[`${i + 1}`] ?? 0} documento(s)`}
                onClick={() => setMonth(i + 1)}
              />
            ))}
          </div>
        ) : category === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <FolderCard
                key={c.slug}
                title={c.label}
                meta={`${counts[`${month}:${c.slug}`] ?? 0} documento(s)`}
                onClick={() => setCategory(c.slug)}
              />
            ))}
          </div>
        ) : (
          <div>
            {!readOnly ? (
              <div className="soft-card flex flex-col items-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Envie os seus documentos em PDF. Cada documento recebe um número automático.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleFiles(e.target.files)}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Enviar PDF
                </button>
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">A carregar…</p>
              ) : docs.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gold/30 px-6 py-10 text-center text-sm text-muted-foreground">
                  Ainda não existem documentos nesta pasta.
                </p>
              ) : (
                docs.map((d) => (
                  <div
                    key={d.id}
                    className="soft-card flex flex-wrap items-center gap-4 px-5 py-4"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg text-foreground">{d.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.original_name} ·{" "}
                        {new Date(d.created_at).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownload(d.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
                      >
                        <Download className="h-4 w-4" /> Descarregar
                      </button>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(d.id)}
                          className="inline-flex items-center justify-center rounded-full border border-ink/15 p-2 text-foreground/60 transition-colors hover:border-destructive hover:text-destructive"
                          aria-label="Remover documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderCard({
  title,
  meta,
  onClick,
}: {
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="soft-card group flex items-center gap-4 p-5 text-left transition-transform hover:-translate-y-0.5"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
        <Folder className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-serif text-lg text-foreground group-hover:text-gold">
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">{meta}</span>
      </span>
    </button>
  );
}
