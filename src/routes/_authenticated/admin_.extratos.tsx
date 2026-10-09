import { requireAdmin } from "@/lib/admin-guard";
import { friendlyError } from "@/lib/friendly-error";
import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, FileSpreadsheet, History, Loader2, Plus, Save, Sparkles, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  deleteStatementHistory,
  extractBankStatement,
  getClientStatementUrl,
  listClientStatements,
  listStatementHistory,
  updateStatementHistory,
  type ClientStatement,
  type HistoryItem,
  type StatementRow,
} from "@/lib/statements.functions";
import { formatDateTimePt } from "@/lib/portal";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const Route = createFileRoute("/_authenticated/admin_/extratos")({
  beforeLoad: requireAdmin,
  component: StatementConverterPage,
  head: () => ({
    meta: [
      { title: "Conversor de Extratos — AS Contabilidade" },
      {
        name: "description",
        content:
          "Ferramenta interna de conversão de extratos bancários em PDF para Excel, para reconciliação bancária.",
      },
      { property: "og:title", content: "Conversor de Extratos — AS Contabilidade" },
      {
        property: "og:description",
        content: "Converter extratos bancários em PDF para folha de cálculo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const emptyRow: StatementRow = { data: "", descricao: "", debito: "", credito: "", saldo: "" };

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.readAsDataURL(file);
  });
}

function StatementConverterPage() {
  const extract = useServerFn(extractBankStatement);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState("");
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [clientDocs, setClientDocs] = useState<ClientStatement[]>([]);
  const [docFilter, setDocFilter] = useState("");
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fetchHistory = useServerFn(listStatementHistory);
  const fetchClientDocs = useServerFn(listClientStatements);
  const saveHistory = useServerFn(updateStatementHistory);
  const removeHistory = useServerFn(deleteStatementHistory);
  const getUrl = useServerFn(getClientStatementUrl);

  async function loadHistory() {
    try {
      setHistory(await fetchHistory());
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void loadHistory();
    fetchClientDocs().then(setClientDocs).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedDocs = useMemo(() => {
    const q = docFilter.trim().toLowerCase();
    const groups = new Map<string, { name: string; nif: string; docs: ClientStatement[] }>();
    for (const d of clientDocs) {
      if (q && !`${d.client_name} ${d.nif}`.toLowerCase().includes(q)) continue;
      const g = groups.get(d.user_id) ?? { name: d.client_name, nif: d.nif, docs: [] };
      g.docs.push(d);
      groups.set(d.user_id, g);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [clientDocs, docFilter]);

  async function openClientDoc(id: string) {
    try {
      const { url } = await getUrl({ data: { id } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(friendlyError(e, "Não foi possível abrir o documento."));
    }
  }

  async function processClientDoc(d: ClientStatement) {
    setBusyDoc(d.id);
    setBusy(true);
    setError(null);
    setRows(null);
    setSaved(false);
    const name = d.client_name;
    setClientName(name);
    try {
      const result = await extract({
        data: { filename: d.original_name, mimeType: "application/pdf", documentId: d.id, clientName: name },
      });
      setRows(result.rows);
      setHistoryId(result.historyId);
      void loadHistory();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (result.rows.length === 0) setError("Não foram encontrados movimentos neste extrato.");
    } catch (e) {
      setError(friendlyError(e, "Erro ao processar o extrato."));
    } finally {
      setBusy(false);
      setBusyDoc(null);
    }
  }

  function openHistory(h: HistoryItem) {
    setRows(h.rows);
    setClientName(h.client_name);
    setHistoryId(h.id);
    setError(null);
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSaveEdits() {
    if (!historyId || !rows) return;
    try {
      await saveHistory({ data: { id: historyId, clientName, rows } });
      setSaved(true);
      void loadHistory();
    } catch (e) {
      setError(friendlyError(e, "Não foi possível guardar."));
    }
  }

  async function onDeleteHistory(id: string) {
    await removeHistory({ data: { id } });
    if (id === historyId) setHistoryId(null);
    void loadHistory();
  }

  async function onProcess() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setRows(null);
    setSaved(false);
    try {
      const fileData = await fileToBase64(file);
      const result = await extract({
        data: { filename: file.name, mimeType: file.type || "application/pdf", fileData, clientName },
      });
      setRows(result.rows);
      setHistoryId(result.historyId);
      void loadHistory();
      if (result.rows.length === 0) {
        setError("Não foram encontrados movimentos neste extrato. Verifique o ficheiro.");
      }
    } catch (e) {
      setError(friendlyError(e, "Erro ao processar o extrato."));
    } finally {
      setBusy(false);
    }
  }

  function updateCell(index: number, key: keyof StatementRow, value: string) {
    setRows((prev) =>
      prev
        ? prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
        : prev,
    );
  }

  function rowsState() {
    return rows;
  }
  function clientNameState() {
    return clientName;
  }

  function parseAmount(value: string): number | null {
    let cleaned = value.replace(/[€\s]/g, "");
    if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function generateExcel(source?: StatementRow[], nameOverride?: string) {
    const rows = source ?? rowsState();
    const clientName = nameOverride ?? clientNameState();
    if (!rows || rows.length === 0) return;
    const money = "#,##0.00"; // vírgula decimal garantida pela localização portuguesa do Excel
    const aoa: (string | number)[][] = [["Data", "Descrição", "Débito", "Crédito", "Saldo"]];
    for (const r of rows) {
      const debito = parseAmount(r.debito);
      const credito = parseAmount(r.credito);
      const saldo = parseAmount(r.saldo);
      aoa.push([
        r.data,
        r.descricao,
        debito === null ? "" : -Math.abs(debito),
        credito === null ? "" : Math.abs(credito),
        saldo === null ? "" : saldo,
      ]);
    }
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    for (let i = 1; i < aoa.length; i++) {
      for (const col of [2, 3, 4]) {
        const ref = XLSX.utils.encode_cell({ r: i, c: col });
        const cell = sheet[ref];
        if (cell && typeof cell.v === "number") cell.z = money;
      }
    }
    sheet["!cols"] = [{ wch: 12 }, { wch: 48 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Extrato");

    const slug = clientName.trim().replace(/\s+/g, "_").replace(/[^\w\-À-ÿ]/g, "") || "Cliente";
    const now = new Date();
    const stamp = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    XLSX.writeFile(book, `Extrato_${slug}_${stamp}.xlsx`);
  }

  return (
    <PortalShell
      title="Conversor de Extratos"
      subtitle="Ferramenta interna: converter extratos bancários em PDF para folha de cálculo."
    >
      <div className="soft-card grid gap-5 p-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Extrato bancário (PDF)
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-full items-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-sm text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <Upload className="h-4 w-4" />
            <span className="truncate">{file ? file.name : "Escolher ficheiro PDF"}</span>
          </button>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Nome do cliente (opcional)
          </label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex.: Maria Silva"
            className="w-full rounded-full border border-ink/15 bg-transparent px-5 py-3 text-sm text-foreground outline-none focus:border-gold"
          />
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onProcess}
            disabled={!file || busy}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "A processar extrato…" : "Processar extrato"}
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Processamento por IA (com custo por
            utilização)
          </span>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {rows ? (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-foreground">
              Revisão dos movimentos{" "}
              <span className="text-sm text-muted-foreground">({rows.length})</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRows((prev) => [...(prev ?? []), { ...emptyRow }])}
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                <Plus className="h-4 w-4" /> Adicionar linha
              </button>
              {historyId ? (
                <button
                  type="button"
                  onClick={onSaveEdits}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
                >
                  <Save className="h-4 w-4" /> {saved ? "Alterações guardadas" : "Guardar alterações"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => generateExcel()}
                disabled={rows.length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
              >
                <FileSpreadsheet className="h-4 w-4" /> Gerar Excel
              </button>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Confirme e corrija os dados antes de exportar. Apague linhas que não sejam movimentos
            reais. Datas em DD/MM/AAAA e valores em formato decimal com ponto.
          </p>

          <div className="soft-card overflow-x-auto p-2">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Descrição</th>
                  <th className="px-3 py-3">Débito</th>
                  <th className="px-3 py-3">Crédito</th>
                  <th className="px-3 py-3">Saldo</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-ink/10">
                    <Cell value={row.data} onChange={(v) => updateCell(index, "data", v)} width="w-28" />
                    <Cell
                      value={row.descricao}
                      onChange={(v) => updateCell(index, "descricao", v)}
                      width="w-full min-w-[240px]"
                    />
                    <Cell value={row.debito} onChange={(v) => updateCell(index, "debito", v)} width="w-28" />
                    <Cell value={row.credito} onChange={(v) => updateCell(index, "credito", v)} width="w-28" />
                    <Cell value={row.saldo} onChange={(v) => updateCell(index, "saldo", v)} width="w-28" />
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        aria-label="Apagar linha"
                        onClick={() =>
                          setRows((prev) => (prev ? prev.filter((_, i) => i !== index) : prev))
                        }
                        className="rounded-full border border-ink/15 p-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-foreground">Extratos enviados pelos clientes</h2>
          <input
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            placeholder="Procurar cliente ou NIF"
            className="w-full max-w-xs rounded-full border border-ink/15 bg-transparent px-5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          />
        </div>
        {groupedDocs.length === 0 ? (
          <p className="soft-card p-6 text-sm text-muted-foreground">
            Ainda não existem extratos bancários enviados pelos clientes.
          </p>
        ) : (
          <div className="space-y-4">
            {groupedDocs.map((g) => (
              <details key={g.name + g.nif} className="soft-card group p-5" open={groupedDocs.length <= 3}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {g.name} {g.nif ? <span className="text-sm text-muted-foreground">· NIF {g.nif}</span> : null}
                  </span>
                  <span className="rounded-full bg-gold/10 px-3 py-1 text-xs text-foreground">
                    {g.docs.length} {g.docs.length === 1 ? "extrato" : "extratos"}
                  </span>
                </summary>
                <ul className="mt-4 divide-y divide-ink/10">
                  {g.docs.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{MONTHS[d.month - 1]} {d.year}</span> · {d.original_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Enviado em {formatDateTimePt(d.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openClientDoc(d.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver PDF
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => processClientDoc(d)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
                        >
                          {busyDoc === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Converter
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-2xl text-foreground">
          <History className="h-5 w-5 text-gold" /> Histórico (últimos 30 dias)
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Reabra ou descarregue de novo o Excel sem voltar a processar o PDF.
        </p>
        {history.length === 0 ? (
          <p className="soft-card p-6 text-sm text-muted-foreground">Ainda não há conversões.</p>
        ) : (
          <ul className="soft-card divide-y divide-ink/10 p-2">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {h.client_name || "Sem cliente"} · <span className="font-normal">{h.filename}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTimePt(h.created_at)} · {h.row_count} movimentos
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openHistory(h)} className="rounded-full border border-ink/15 px-4 py-2 text-xs text-foreground transition-colors hover:border-gold hover:text-gold">
                    Abrir
                  </button>
                  <button type="button" onClick={() => generateExcel(h.rows, h.client_name)} className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-gold-deep">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button type="button" aria-label="Apagar do histórico" onClick={() => onDeleteHistory(h.id)} className="rounded-full border border-ink/15 p-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  );
}

function Cell({
  value,
  onChange,
  width,
}: {
  value: string;
  onChange: (value: string) => void;
  width: string;
}) {
  return (
    <td className="px-3 py-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${width} rounded-xl border border-ink/10 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-gold`}
      />
    </td>
  );
}
