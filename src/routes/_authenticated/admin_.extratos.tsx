import { requireAdmin } from "@/lib/admin-guard";
import { friendlyError } from "@/lib/friendly-error";
import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, FileSpreadsheet, History, Plus, Save, Sparkles, Trash2, Upload } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { zipSync } from "fflate";

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
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
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
  const [selected, setSelected] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [batchResults, setBatchResults] = useState<HistoryItem[]>([]);
  const [currentFilename, setCurrentFilename] = useState("Extrato.pdf");
  const fetchHistory = useServerFn(listStatementHistory);
  const fetchClientDocs = useServerFn(listClientStatements);
  const saveHistory = useServerFn(updateStatementHistory);
  const removeHistory = useServerFn(deleteStatementHistory);
  const getUrl = useServerFn(getClientStatementUrl);

  async function loadHistory() {
    try {
      setHistory(await fetchHistory());
    } catch (e) {
      setError(friendlyError(e, "Não foi possível carregar o histórico."));
    }
  }
  useEffect(() => {
    void loadHistory();
    fetchClientDocs().then(setClientDocs).catch((e) => setError(friendlyError(e, "Não foi possível carregar os extratos.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDocs = useMemo(() => {
    const q = docFilter.trim().toLowerCase();
    return clientDocs.filter((d) => !q || `${d.client_name} ${d.nif}`.toLowerCase().includes(q))
      .sort((a, b) => a.client_name.localeCompare(b.client_name, "pt") || b.created_at.localeCompare(a.created_at));
  }, [clientDocs, docFilter]);
  const groupedDocs = useMemo(() => {
    const groups = new Map<string, { name: string; nif: string; docs: ClientStatement[] }>();
    for (const d of filteredDocs.slice(0, visibleCount)) {
      const g = groups.get(d.user_id) ?? { name: d.client_name, nif: d.nif, docs: [] };
      g.docs.push(d);
      groups.set(d.user_id, g);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [filteredDocs, visibleCount]);

  function downloadZip(items: HistoryItem[]) {
    const files: Record<string, Uint8Array> = {};
    const safe = (name: string) => name.replace(/[^\wÀ-ÿ.-]+/g, "_") || "Cliente";
    for (const item of items) {
      const doc = clientDocs.find((d) => d.original_name === item.filename && d.client_name === item.client_name);
      const period = doc ? `${doc.year}/${String(doc.month).padStart(2, "0")}/` : "";
      const bytes = generateExcel(item.rows, item.client_name, true);
      if (bytes) files[`${safe(item.client_name)}/${period}${safe(item.filename.replace(/\.pdf$/i, ""))}_${item.id}.xlsx`] = bytes;
    }
    if (!Object.keys(files).length) return;
    const archive = zipSync(files);
    const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url; link.download = "Extratos_Excel.zip"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function processSelected() {
    const docs = clientDocs.filter((d) => selected.includes(d.id));
    setBusy(true); setError(null); setBatchResults([]);
    const results: HistoryItem[] = [];
    const failures: string[] = [];
    try {
      for (const [index, d] of docs.entries()) {
        setProgressLabel(`A converter ${index + 1} de ${docs.length} · ${d.client_name}`);
        setProgressPct(Math.round((index / docs.length) * 100));
        try {
          const result = await extract({ data: { filename: d.original_name, mimeType: "application/pdf", documentId: d.id, clientName: d.client_name } });
          if (!result.historyId || !result.rows.length) throw new Error("Sem movimentos ou histórico não guardado.");
          results.push({ id: result.historyId, client_name: d.client_name, filename: d.original_name, rows: result.rows, row_count: result.rows.length, created_at: new Date().toISOString() });
        } catch (e) { failures.push(`${d.client_name} — ${d.original_name}: ${friendlyError(e, "Não foi possível converter.")}`); }
      }
      setProgressPct(100);
      setBatchResults(results);
      if (failures.length) setError(failures.join(" · "));
      await loadHistory();
    } finally { setBusy(false); setProgressLabel(null); setProgressPct(null); }
  }

  async function exportCurrent() {
    if (!rows?.length || !historyId) return;
    setBusy(true); setError(null);
    try {
      await saveHistory({ data: { id: historyId, clientName, rows } });
      setSaved(true);
      generateExcel(rows, clientName);
      await loadHistory();
    } catch (e) { setError(friendlyError(e, "Não foi possível guardar o Excel no histórico.")); }
    finally { setBusy(false); }
  }

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
    setProgressLabel(`A converter ${d.original_name}`);
    setProgressPct(null);
    const name = d.client_name;
    setCurrentFilename(d.original_name);
    setClientName(name);
    try {
      const result = await extract({
        data: { filename: d.original_name, mimeType: "application/pdf", documentId: d.id, clientName: name },
      });
      setRows(result.rows);
      setHistoryId(result.historyId);
      void loadHistory();
      document.getElementById("revisao")?.scrollIntoView({ behavior: "smooth" });
      if (result.rows.length === 0) setError("Não foram encontrados movimentos neste extrato.");
    } catch (e) {
      setError(friendlyError(e, "Erro ao processar o extrato."));
    } finally {
      setBusy(false);
      setBusyDoc(null);
      setProgressLabel(null);
      setProgressPct(null);
    }
  }

  function openHistory(h: HistoryItem) {
    setCurrentFilename(h.filename);
    setRows(h.rows);
    setClientName(h.client_name);
    setHistoryId(h.id);
    setError(null);
    setSaved(false);
    document.getElementById("revisao")?.scrollIntoView({ behavior: "smooth" });
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
    if (uploadFiles.length > 1) {
      setBusy(true); setError(null); setBatchResults([]);
      const results: HistoryItem[] = [];
      const failures: string[] = [];
      try {
        for (const [index, upload] of uploadFiles.entries()) {
          setProgressLabel(`A processar ${index + 1} de ${uploadFiles.length} · ${upload.name}`);
          setProgressPct(Math.round((index / uploadFiles.length) * 100));
          try {
            const result = await extract({ data: { filename: upload.name, mimeType: "application/pdf", fileData: await fileToBase64(upload), clientName } });
            if (!result.historyId || !result.rows.length) throw new Error("Não foram encontrados movimentos.");
            results.push({ id: result.historyId, filename: upload.name, client_name: clientName, rows: result.rows, row_count: result.rows.length, created_at: new Date().toISOString() });
          } catch (e) { failures.push(`${upload.name}: ${friendlyError(e, "Não foi possível converter.")}`); }
        }
        setProgressPct(100);
        setBatchResults(results);
        if (failures.length) setError(failures.join(" · "));
        await loadHistory();
      } finally { setBusy(false); setProgressLabel(null); setProgressPct(null); }
      return;
    }
    setCurrentFilename(file.name);
    setBusy(true);
    setError(null);
    setRows(null);
    setSaved(false);
    setProgressLabel(`A processar ${file.name}`);
    setProgressPct(null);
    try {
      const fileData = await fileToBase64(file);
      const result = await extract({
        data: { filename: file.name, mimeType: file.type || "application/pdf", fileData, clientName },
      });
      setRows(result.rows);
      setHistoryId(result.historyId);
      void loadHistory();
      document.getElementById("revisao")?.scrollIntoView({ behavior: "smooth" });
      if (result.rows.length === 0) {
        setError("Não foram encontrados movimentos neste extrato. Verifique o ficheiro.");
      }
    } catch (e) {
      setError(friendlyError(e, "Erro ao processar o extrato."));
    } finally {
      setBusy(false);
      setProgressLabel(null);
      setProgressPct(null);
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

  function generateExcel(source?: StatementRow[], nameOverride?: string, asBytes = false): Uint8Array | undefined {
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
    if (asBytes) return new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" }));
    const filename = currentFilename.replace(/\.pdf$/i, "").replace(/[^\wÀ-ÿ.-]+/g, "_");
    XLSX.writeFile(book, `Extrato_${slug}_${filename}_${stamp}.xlsx`);
    return undefined;
  }

  return (
    <PortalShell
      title="Conversor de Extratos"
      subtitle="Extratos bancários"
    >
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-foreground">Extratos enviados pelos clientes</h2>
          <input
            value={docFilter}
            onChange={(e) => { setDocFilter(e.target.value); setVisibleCount(10); }}
            placeholder="Procurar cliente ou NIF"
            className="w-full max-w-xs rounded-full border border-ink/15 bg-transparent px-5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-white/60 px-4 py-2.5">
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Converter ficheiro descarregado</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => { const files = Array.from(e.target.files ?? []); setUploadFiles(files); setFile(files[0] ?? null); }}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="max-w-[220px] truncate">{uploadFiles.length > 1 ? `${uploadFiles.length} PDF selecionados` : file ? file.name : "Escolher PDF"}</span>
          </Button>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Cliente (opcional)"
            className="w-44 rounded-full border border-ink/15 bg-transparent px-3.5 py-1.5 text-xs text-foreground outline-none focus:border-gold"
          />
          <Button
            type="button"
            onClick={onProcess}
            disabled={!file || busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" /> Processar
          </Button>
          <span className="text-[11px] text-muted-foreground">Processamento por IA · com custo por extrato</span>
        </div>

        {error ? (
          <p className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {filteredDocs.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Checkbox id="select-statements" disabled={busy} checked={filteredDocs.slice(0, visibleCount).every((d) => selected.includes(d.id))} onCheckedChange={(checked) => setSelected((prev) => checked ? [...new Set([...prev, ...filteredDocs.slice(0, visibleCount).map((d) => d.id)])] : prev.filter((id) => !filteredDocs.slice(0, visibleCount).some((d) => d.id === id)))} />
            <label htmlFor="select-statements" className="text-sm text-muted-foreground">Selecionar visíveis</label>
            <span className="text-xs text-muted-foreground">{selected.length} selecionados</span>
            <Button className="rounded-full" disabled={busy || !selected.length} onClick={processSelected}><Sparkles />Converter selecionados</Button>
            {selected.length > 0 && <Button variant="ghost" disabled={busy} onClick={() => setSelected([])}>Limpar</Button>}
          </div>
        )}

        {progressLabel ? (
          <div role="status" className="mb-4 max-w-xl">
            <p className="mb-1.5 text-sm text-muted-foreground">{progressLabel}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              {progressPct === null ? (
                <div className="progress-slide h-full w-1/3 rounded-full bg-gold" />
              ) : (
                <div className="h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${progressPct}%` }} />
              )}
            </div>
          </div>
        ) : null}

        {batchResults.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 border-y border-border py-3">
            <span className="text-sm">{batchResults.length} extratos convertidos</span>
            <Button className="rounded-full" onClick={() => downloadZip(batchResults)}><FileSpreadsheet />Descarregar ZIP</Button>
          </div>
        )}

        {groupedDocs.length === 0 ? (
          <p className="soft-card p-6 text-sm text-muted-foreground">
            Ainda não existem extratos bancários enviados pelos clientes.
          </p>
        ) : (
          <div className="space-y-4">
            {groupedDocs.map((g) => (
              <details key={g.name + g.nif} className="group border-b border-border py-3" open>
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
                    <li key={d.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                      <Checkbox aria-label={`Selecionar ${d.original_name}`} disabled={busy} checked={selected.includes(d.id)} onCheckedChange={(checked) => setSelected((prev) => checked ? [...prev, d.id] : prev.filter((id) => id !== d.id))} />
                      <div className="min-w-0">
                        <p className="break-words text-sm text-foreground">
                          <span className="font-medium">{MONTHS[d.month - 1]} {d.year}</span> · {d.original_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Enviado em {formatDateTimePt(d.created_at)}</p>
                      </div>
                      <div className="col-start-2 flex gap-2 sm:col-start-auto">
                        <Button
                          type="button"
                          onClick={() => openClientDoc(d.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver PDF
                        </Button>
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => processClientDoc(d)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {busyDoc === d.id ? "A converter…" : "Converter"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
        {visibleCount < filteredDocs.length && <div className="mt-4 text-center"><Button variant="outline" className="rounded-full" onClick={() => setVisibleCount((count) => count + 10)}>Ver mais {Math.min(10, filteredDocs.length - visibleCount)}</Button></div>}
      </section>

      {rows ? (
        <section id="revisao" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-foreground">
              {currentFilename}{" "}
              <span className="text-sm text-muted-foreground">({rows.length})</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => setRows((prev) => [...(prev ?? []), { ...emptyRow }])}
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                <Plus className="h-4 w-4" /> Adicionar linha
              </Button>
              {historyId ? (
                <Button
                  type="button"
                  onClick={onSaveEdits}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
                >
                  <Save className="h-4 w-4" /> {saved ? "Alterações guardadas" : "Guardar alterações"}
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={exportCurrent}
                disabled={rows.length === 0 || busy || !historyId}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
              >
                <FileSpreadsheet className="h-4 w-4" /> Gerar Excel
              </Button>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Confirme e corrija os dados antes de exportar. Apague linhas que não sejam movimentos
            reais. Datas em DD/MM/AAAA e valores com vírgula decimal no Excel.
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
                      <Button
                        type="button"
                        aria-label="Apagar linha"
                        onClick={() =>
                          setRows((prev) => (prev ? prev.filter((_, i) => i !== index) : prev))
                        }
                        className="rounded-full border border-ink/15 p-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

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
                  <Button type="button" onClick={() => openHistory(h)} className="rounded-full border border-ink/15 px-4 py-2 text-xs text-foreground transition-colors hover:border-gold hover:text-gold">
                    Abrir
                  </Button>
                  <Button type="button" onClick={() => generateExcel(h.rows, h.client_name)} className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-gold-deep">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </Button>
                  <Button type="button" aria-label="Apagar do histórico" onClick={() => onDeleteHistory(h.id)} className="rounded-full border border-ink/15 p-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
