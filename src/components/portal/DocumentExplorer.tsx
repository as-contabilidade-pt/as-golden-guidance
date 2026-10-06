import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight,
  ChevronDown,
  Download,
  FileText,
  Folder,
  Loader2,
  CheckCircle2,
  Lock,
  Trash2,
  Upload,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { ScanDialog } from "@/components/portal/ScanDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  MONTHS,
  availableYears,
  categoryLabel,
  monthLabel,
  isMonthPastDeadline,
  lockDate,
  formatDatePt,
  formatDateTimePt,
  documentDisplayName,
  documentPartyField,
  todayInputValue,
  DECLARATION_TEXT,
  DECLARATION_CHECKBOX,
  SUBMISSION_DECLARATION_TEXT,
  SUBMISSION_DECLARATION_CHECKBOX,
} from "@/lib/portal";
import {
  confirmDocument,
  countsForYear,
  deleteDocument,
  getDownloadUrl,
  listDocuments,
  reserveDocument,
  listUnlockRequests,
  createUnlockRequest,
  listMonthSubmissions,
  submitMonth,
  listCategories,
  getMyClientIdentity,
} from "@/lib/portal.functions";


type Category = { id: string; slug: string; label: string; position: number };


type Doc = {
  id: string;
  label: string;
  original_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
  supplier: string | null;
  doc_date: string | null;
  late?: boolean | null;
  late_submitted_at?: string | null;
};


type MonthSubmission = {
  id: string;
  year: number;
  month: number;
  submitted_at: string;
  document_count: number;
};

type UnlockRequest = {
  id: string;
  year: number;
  month: number;
  reason: string;
  status: "pendente" | "aprovado" | "rejeitado" | "fechado";
  admin_note: string | null;
  created_at: string;
  decided_at: string | null;
};

export function DocumentExplorer({
  clientId,
  readOnly = false,
}: {
  clientId?: string;
  readOnly?: boolean;
}) {
  const years = availableYears();
  const navigate = useNavigate();
  const search = useRouterState({
    select: (s) => s.location.search as Record<string, unknown>,
  });
  const yearParam = Number(search["ano"]);
  const year = years.includes(yearParam) ? yearParam : years[0]!;
  const monthParam = search["mes"] === undefined ? NaN : Number(search["mes"]);
  const month = Number.isInteger(monthParam) && monthParam >= 0 && monthParam <= 11 ? monthParam : null;
  const category = month !== null && typeof search["pasta"] === "string" ? search["pasta"] : null;
  const partyField = documentPartyField(category ?? "");
  const updateNav = useCallback(
    (next: { ano?: number; mes?: number | null; pasta?: string | null }) => {
      void navigate({
        to: ".",
        search: ((prev: Record<string, unknown>) => {
          const out: Record<string, unknown> = { ...prev };
          for (const [k, v] of Object.entries(next)) {
            if (v === null || v === undefined) delete out[k];
            else out[k] = v;
          }
          return out;
        }) as never,
      });
    },
    [navigate],
  );
  const setYear = (y: number) => updateNav({ ano: y, mes: null, pasta: null });
  const setMonth = (m: number | null) => updateNav({ mes: m, pasta: null });
  const setCategory = (c: string | null) => updateNav({ pasta: c });
  const [showPast, setShowPast] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supplier, setSupplier] = useState("");
  const [docDate, setDocDate] = useState(todayInputValue());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState<UnlockRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submissions, setSubmissions] = useState<MonthSubmission[]>([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitAccepted, setSubmitAccepted] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [identity, setIdentity] = useState<{
    companyName: string;
    nif: string;
    responsibleName: string;
  } | null>(null);
  const [responsibleName, setResponsibleName] = useState("");

  const fetchCounts = useServerFn(countsForYear);
  const fetchDocs = useServerFn(listDocuments);
  const reserve = useServerFn(reserveDocument);
  const confirm = useServerFn(confirmDocument);
  const remove = useServerFn(deleteDocument);
  const download = useServerFn(getDownloadUrl);
  const fetchRequests = useServerFn(listUnlockRequests);
  const submitRequest = useServerFn(createUnlockRequest);
  const fetchSubmissions = useServerFn(listMonthSubmissions);
  const sendSubmission = useServerFn(submitMonth);
  const fetchCategories = useServerFn(listCategories);
  const fetchIdentity = useServerFn(getMyClientIdentity);

  useEffect(() => {
    void (async () => {
      try {
        setCategories((await fetchCategories()) as unknown as Category[]);
      } catch {
        /* ignore */
      }
    })();
  }, [fetchCategories]);

  useEffect(() => {
    if (readOnly) return;
    void (async () => {
      try {
        const info = (await fetchIdentity()) as unknown as {
          companyName: string;
          nif: string;
          responsibleName: string;
        };
        setIdentity(info);
        setResponsibleName(info.responsibleName ?? "");
      } catch {
        /* ignore */
      }
    })();
  }, [fetchIdentity, readOnly]);




  const loadSubmissions = useCallback(async () => {
    try {
      setSubmissions(
        (await fetchSubmissions({
          data: { year, ...(clientId ? { clientId } : {}) },
        })) as MonthSubmission[],
      );
    } catch {
      /* ignore */
    }
  }, [fetchSubmissions, year, clientId]);

  const loadRequests = useCallback(async () => {
    try {
      setRequests(
        (await fetchRequests({
          data: { year, ...(clientId ? { clientId } : {}) },
        })) as UnlockRequest[],
      );
    } catch {
      /* ignore */
    }
  }, [fetchRequests, year, clientId]);

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
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  function submissionFor(m: number) {
    return submissions.find((s) => s.month === m) ?? null;
  }

  function requestFor(m: number) {
    return requests.find((r) => r.month === m && r.status !== "fechado") ?? null;
  }

  function monthLocked(m: number) {
    if (!isMonthPastDeadline(year, m) && !submissionFor(m)) return false;
    return requestFor(m)?.status !== "aprovado";
  }

  const currentRequest = month !== null ? requestFor(month) : null;
  const currentSubmission = month !== null ? submissionFor(month) : null;

  async function onSubmitMonth() {
    if (month === null) return;
    setBusy(true);
    setError(null);
    try {
      await sendSubmission({
        data: {
          year,
          month,
          responsibleName: responsibleName.trim(),
          declarationAccepted: true as const,
        },
      });
      setShowSubmit(false);
      setSubmitAccepted(false);
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível submeter a documentação.");
    } finally {
      setBusy(false);
    }
  }
  const locked = month !== null && !readOnly && monthLocked(month);

  async function onSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (month === null || !accepted) return;
    setBusy(true);
    setError(null);
    try {
      await submitRequest({
        data: {
          year,
          month,
          reason,
          responsibleName: responsibleName.trim(),
          declarationAccepted: true as const,
        },
      });

      setReason("");
      setAccepted(false);
      setShowForm(false);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o pedido.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || month === null || category === null) return;
    setError(null);
    if (!supplier.trim()) {
      setError(`Indique ${partyField.label.toLocaleLowerCase("pt-PT")} antes de enviar.`);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(docDate)) {
      setError("Indique a data do documento.");
      return;
    }
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
            supplier: supplier.trim(),
            docDate,
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
      setSupplier("");
      setDocDate(todayInputValue());
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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  function monthStatus(m: number): "locked" | "current" | "future" | "default" {
    if (monthLocked(m)) return "locked";
    if (year === currentYear && m === currentMonth) return "current";
    if (year > currentYear || (year === currentYear && m > currentMonth)) return "future";
    return "default";
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {month !== null ? (
          <button
            type="button"
            onClick={() => {
              setMonth(null);
            }}
            className="rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:text-gold"
          >
            {year}
          </button>
        ) : null}
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
              {categoryLabel(category, categories)}
            </span>
          </>
        ) : null}
      </div>

      {month === null ? (
        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gold px-5 py-2 text-xs font-medium text-ink">
            {year}
          </span>
          {otherYears.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setYearsOpen((v) => !v)}
                aria-expanded={yearsOpen}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-5 py-2 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                Outros anos
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${yearsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {yearsOpen ? (
                <div className="absolute left-0 top-full z-30 mt-2 flex flex-wrap gap-2 rounded-2xl border border-ink/10 bg-background p-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]">
                  {otherYears.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setYear(y);
                        setYearsOpen(false);
                      }}
                      className="rounded-full border border-ink/15 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
                    >
                      {y}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        {month === null ? (
          (() => {
            const renderCard = (m: number, size: "md" | "lg" = "md") => {
              const name = MONTHS[m - 1]!;
              const submitted = submissionFor(m);
              return (
                <FolderCard
                  key={name}
                  title={name}
                  meta={
                    submitted
                      ? `${counts[`${m}`] ?? 0} documento(s) · submetida em ${formatDatePt(
                          submitted.submitted_at,
                        )}`
                      : `${counts[`${m}`] ?? 0} documento(s)`
                  }
                  status={monthStatus(m)}
                  size={size}
                  onClick={() => setMonth(m)}
                />
              );
            };
            const all = MONTHS.map((_, i) => i + 1);
            const open = all.filter((m) => {
              const s = monthStatus(m);
              return s === "current" || s === "default";
            });
            const lockedList = all.filter((m) => monthStatus(m) === "locked");
            return (
              <div className="space-y-8">
                {open.length > 0 ? (
                  <div
                    className={`mx-auto grid gap-5 ${
                      open.length === 1 ? "max-w-md grid-cols-1" : "max-w-3xl sm:grid-cols-2"
                    }`}
                  >
                    {open.map((m) => renderCard(m, "lg"))}
                  </div>
                ) : (
                  <p className="soft-card px-6 py-5 text-sm text-muted-foreground">
                    Não existem meses abertos para submissão neste ano.
                  </p>
                )}

                {lockedList.length > 0 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPast((v) => !v)}
                      aria-expanded={showPast}
                      className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
                    >
                      {showPast ? "Ocultar meses anteriores" : "Ver meses anteriores"}
                      <span className="text-muted-foreground">({lockedList.length})</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${showPast ? "rotate-180" : ""}`}
                      />
                    </button>
                    {showPast ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {lockedList.map((m) => renderCard(m))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

              </div>
            );
          })()
        ) : category === null ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <FolderCard
                  key={c.slug}
                  title={c.label}
                  meta={`${counts[`${month}:${c.slug}`] ?? 0} documento(s)`}
                  onClick={() => setCategory(c.slug)}
                />
              ))}
            </div>

            {currentSubmission ? (
              <div className="soft-card flex flex-wrap items-center gap-4 p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg text-foreground">
                    Documentação de {monthLabel(month)} {year} submetida com sucesso em{" "}
                    {formatDateTimePt(currentSubmission.submitted_at)}.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentSubmission.document_count} documento(s) submetido(s). A pasta está em
                    modo de visualização.
                  </p>
                </div>
              </div>
            ) : !readOnly && !monthLocked(month) ? (
              <div className="soft-card p-6">
                {showSubmit ? (
                  <div className="space-y-4">
                    <p className="font-serif text-xl text-foreground">Confirmar submissão</p>
                    <div className="rounded-2xl border border-gold/20 bg-background px-5 py-4 text-xs text-muted-foreground">
                      <p>
                        <strong className="text-foreground">NIF DA EMPRESA:</strong>{" "}
                        {identity?.nif || "—"}
                      </p>
                      <p>
                        <strong className="text-foreground">NOME DA EMPRESA:</strong>{" "}
                        {identity?.companyName || "—"}
                      </p>
                      <p>
                        <strong className="text-foreground">PERÍODO:</strong> {monthLabel(month)}/
                        {year}
                      </p>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-foreground/80">
                        Nome do responsável
                      </span>
                      <input
                        value={responsibleName}
                        onChange={(e) => setResponsibleName(e.target.value)}
                        className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
                      />
                    </label>
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/80">
                      Declaração de conclusão da entrega
                    </p>
                    <p className="rounded-2xl bg-secondary px-5 py-4 text-xs leading-relaxed text-muted-foreground">
                      {SUBMISSION_DECLARATION_TEXT}
                    </p>
                    <label className="flex items-start gap-3 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={submitAccepted}
                        onChange={(e) => setSubmitAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[color:var(--gold)]"
                      />
                      <span>{SUBMISSION_DECLARATION_CHECKBOX}</span>
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={!submitAccepted || busy}
                        onClick={() => void onSubmitMonth()}
                        className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Confirmar Submissão
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubmit(false);
                          setSubmitAccepted(false);
                        }}
                        className="rounded-full border border-ink/15 px-6 py-3 text-sm text-foreground transition-colors hover:border-gold hover:text-gold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-xl text-foreground">
                        Submeter a documentação de {monthLabel(month)} {year}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(counts[`${month}`] ?? 0) > 0
                          ? "Depois de submeter, a pasta fica em modo de visualização."
                          : "É necessário anexar pelo menos um documento antes de submeter."}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={(counts[`${month}`] ?? 0) === 0}
                      onClick={() => setShowSubmit(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Submeter Documentação do Mês
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div>
            {locked ? (
              <div className="soft-card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                    <Lock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg text-foreground">Pasta bloqueada</p>
                    <p className="text-xs text-muted-foreground">
                      Bloqueada desde{" "}
                      {currentSubmission
                        ? formatDatePt(currentSubmission.submitted_at)
                        : formatDatePt(lockDate(year, month))}
                      . Pode consultar e
                      descarregar os documentos, mas não adicionar ou remover.
                    </p>
                  </div>
                </div>

                {currentRequest ? (
                  <div className="mt-4 rounded-2xl border border-gold/25 bg-gold/5 px-5 py-4 text-sm">
                    <p className="text-foreground">
                      Pedido de desbloqueio{" "}
                      <strong className="text-gold">
                        {currentRequest.status === "pendente"
                          ? "pendente"
                          : currentRequest.status === "aprovado"
                            ? "aprovado"
                            : "rejeitado"}
                      </strong>{" "}
                      · enviado a {formatDateTimePt(currentRequest.created_at)}
                    </p>
                    {currentRequest.decided_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Decisão em {formatDateTimePt(currentRequest.decided_at)}
                        {currentRequest.admin_note ? ` · ${currentRequest.admin_note}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : showForm ? (
                  <form onSubmit={onSubmitRequest} className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-gold/20 bg-background px-5 py-4 text-xs text-muted-foreground">
                      <p>
                        <strong className="text-foreground">NIF DA EMPRESA:</strong>{" "}
                        {identity?.nif || "—"}
                      </p>
                      <p>
                        <strong className="text-foreground">NOME DA EMPRESA:</strong>{" "}
                        {identity?.companyName || "—"}
                      </p>
                      <p>
                        <strong className="text-foreground">PERÍODO A REABRIR:</strong>{" "}
                        {monthLabel(month)}/{year}
                      </p>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-foreground/80">
                        Nome do responsável
                      </span>
                      <input
                        value={responsibleName}
                        onChange={(e) => setResponsibleName(e.target.value)}
                        className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-foreground/80">
                        Motivo da entrega fora de prazo
                      </span>
                      <textarea
                        required
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
                      />
                    </label>
                    <p className="rounded-2xl bg-secondary px-5 py-4 text-xs leading-relaxed text-muted-foreground">
                      {DECLARATION_TEXT}
                    </p>
                    <label className="flex items-start gap-3 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[color:var(--gold)]"
                      />
                      <span>{DECLARATION_CHECKBOX}</span>
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={!accepted || busy}
                        className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Enviar pedido
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="rounded-full border border-ink/15 px-6 py-3 text-sm text-foreground transition-colors hover:border-gold hover:text-gold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold px-6 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink"
                  >
                    Pedir desbloqueio para entrega fora de prazo
                  </button>
                )}
              </div>
            ) : !readOnly ? (
              <div className="soft-card flex flex-col gap-4 p-6 sm:p-8">
                <p className="text-sm text-muted-foreground">
                  Envie os seus documentos em PDF. Cada documento recebe um número automático.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-left">
                    <span className="mb-2 block text-xs font-medium text-foreground/80">
                      {partyField.label}
                    </span>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder={partyField.placeholder}
                      className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
                    />
                  </label>
                  <label className="block text-left">
                    <span className="mb-2 block text-xs font-medium text-foreground/80">
                      Data do documento
                    </span>
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
                    />
                  </label>
                </div>
                <p className="text-left text-xs text-muted-foreground">
                  Nome final do documento:{" "}
                  <span className="text-gold">
                    {documentDisplayName(
                      `${String(month).padStart(2, "0")}-NN`,
                      supplier || partyField.label,
                      docDate,
                    )}
                  </span>
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => void handleFiles(e.target.files)}
                />

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={busy || !supplier.trim() || !docDate}
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
                  <button
                    type="button"
                    disabled={busy || !supplier.trim() || !docDate}
                    onClick={() => setShowScan(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-gold px-6 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                    Digitalizar Documento
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A digitalização usa a câmara do telemóvel e cria automaticamente um PDF.
                </p>
                <ScanDialog
                  open={showScan}
                  onClose={() => setShowScan(false)}
                  onReady={(file) => handleFiles([file])}
                />
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
                    className={`soft-card flex flex-wrap items-center gap-4 px-5 py-4 ${
                      d.late ? "border-destructive/40 bg-destructive/5" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                        d.late ? "bg-destructive/15 text-destructive" : "bg-gold/15 text-gold"
                      }`}
                    >
                      {d.late ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg text-foreground">
                        {documentDisplayName(d.label, d.supplier, d.doc_date)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.original_name} ·{" "}
                        {new Date(d.created_at).toLocaleDateString("pt-PT")}
                      </p>
                      {d.late ? (
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Entregue fora de prazo em{" "}
                          {formatDatePt(d.late_submitted_at ?? d.created_at)}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownload(d.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
                      >
                        <Download className="h-4 w-4" /> Descarregar
                      </button>
                      {!readOnly && !locked ? (
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
  status = "default",
  size = "md",
}: {
  title: string;
  meta: string;
  onClick: () => void;
  status?: "locked" | "current" | "future" | "default";
  size?: "md" | "lg";
}) {
  const styles = {
    locked: {
      card: "border-[oklch(0.55_0.18_25)/45%] bg-[oklch(0.985_0_0)] hover:border-[oklch(0.55_0.18_25)/65%]",
      iconBg: "bg-[oklch(0.55_0.18_25/12%)]",
      icon: "text-[oklch(0.55_0.18_25)]",
      title: "text-foreground",
      meta: "text-[oklch(0.55_0.18_25)]",
    },
    current: {
      card: "border-gold/70 bg-gold/[8%] shadow-[0_4px_28px_-10px_color-mix(in_oklab,var(--gold)_28%,transparent)] hover:border-gold hover:-translate-y-0.5",
      iconBg: "bg-gold/25",
      icon: "text-gold-deep",
      title: "text-foreground group-hover:text-gold",
      meta: "text-gold-deep",
    },
    future: {
      card: "border-ink/8 bg-ink/[3%] opacity-70 hover:opacity-90",
      iconBg: "bg-ink/8",
      icon: "text-muted-foreground",
      title: "text-muted-foreground",
      meta: "text-muted-foreground/80",
    },
    default: {
      card: "",
      iconBg: "bg-gold/15",
      icon: "text-gold",
      title: "text-foreground group-hover:text-gold",
      meta: "text-muted-foreground",
    },
  }[status];

  const large = size === "lg";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`soft-card group flex items-center gap-5 text-left transition-transform ${large ? "p-7" : "p-5"} ${styles.card} ${status === "current" && large ? "month-glow" : ""}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-2xl ${large ? "h-16 w-16" : "h-12 w-12"} ${styles.iconBg} ${styles.icon}`}
      >
        {status === "locked" ? (
          <Lock className={large ? "h-7 w-7" : "h-5 w-5"} />
        ) : (
          <Folder className={large ? "h-7 w-7" : "h-5 w-5"} />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate font-serif transition-colors ${large ? "text-2xl" : "text-lg"} ${styles.title}`}
        >
          {title}
        </span>
        <span className={`block ${large ? "text-sm" : "text-xs"} ${styles.meta}`}>
          {meta}
          {status === "locked" ? " · bloqueada" : ""}
        </span>
      </span>
    </button>
  );
}
