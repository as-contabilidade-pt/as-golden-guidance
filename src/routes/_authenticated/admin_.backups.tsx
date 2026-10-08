import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zipSync, strToU8 } from "fflate";
import * as XLSX from "xlsx";
import { Archive, CalendarRange, Download, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import { requireAdmin } from "@/lib/admin-guard";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { buildBackupManifest, listBackupClients } from "@/lib/backup.functions";
import { formatDatePt, formatDateTimePt } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/admin_/backups")({
  beforeLoad: requireAdmin,
  head: () => ({ meta: [
    { title: "Cópias de Segurança — AS Contabilidade" },
    { name: "description", content: "Exportar dados e documentos dos clientes em ZIP." },
    { property: "og:title", content: "Cópias de Segurança — AS Contabilidade" },
    { property: "og:description", content: "Exportar dados e documentos dos clientes em ZIP." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BackupPage,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const safe = (s: string) => (s || "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "sem-nome";
const pad = (n: number) => String(n).padStart(2, "0");

function sheet(rows: Record<string, unknown>[]) {
  return XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "Sem registos" }]);
}

function BackupPage() {
  const fetchClients = useServerFn(listBackupClients);
  const fetchManifest = useServerFn(buildBackupManifest);
  const [clients, setClients] = useState<{ id: string; full_name: string; nif: string }[]>([]);
  const [clientId, setClientId] = useState("all");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [mode, setMode] = useState<"simple" | "range">("simple");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { fetchClients().then(setClients).catch(() => {}); }, [fetchClients]);

  const nowY = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => nowY + 1 - i);
  const minKey = (nowY - 5) * 12;
  const maxKey = (nowY + 1) * 12 + 11;
  const nowKey = nowY * 12 + new Date().getMonth();
  const [range, setRange] = useState<[number, number]>([nowKey - 11, nowKey]);
  const keyLabel = (k: number) => `${MONTHS[k % 12]} ${Math.floor(k / 12)}`;
  const cId = clientId === "all" ? "" : clientId;
  const clientName = cId ? clients.find((c) => c.id === cId)?.full_name ?? "" : "Todos os clientes";
  const periodLabel = mode === "range"
    ? `${keyLabel(range[0])} a ${keyLabel(range[1])}`
    : `${month === "all" ? "Todos os meses" : MONTHS[Number(month) - 1]} · ${year === "all" ? "Todos os anos" : year}`;

  async function run() {
    setConfirm(false);
    setBusy(true); setError(""); setProgress("A preparar a lista de ficheiros…");
    try {
      const m = await fetchManifest({ data: mode === "range"
        ? { clientId: cId || undefined, fromKey: range[0], toKey: range[1] }
        : {
          clientId: cId || undefined,
          year: year !== "all" ? Number(year) : undefined,
          month: month !== "all" ? Number(month) : undefined,
        } });
      const prof = new Map((m.profiles as any[]).map((p) => [p.id, p]));
      const cat = new Map((m.categories as any[]).map((c) => [c.slug, c.label]));
      const files: Record<string, Uint8Array> = {};
      const used = new Set<string>();
      const docs = m.documents as any[];
      let done = 0, failed = 0;
      const queue = [...docs];
      const worker = async () => {
        while (queue.length) {
          const d = queue.shift()!;
          const p = prof.get(d.user_id);
          const folder = `Documentos/${safe(p?.full_name ?? "Cliente")} (NIF ${p?.nif || "-"})/${d.year}/${pad(d.month)} - ${MONTHS[d.month - 1]}/${safe(cat.get(d.category) ?? d.category)}`;
          let name = `${folder}/${safe(d.original_name)}`;
          let k = 2;
          while (used.has(name)) name = `${folder}/${k++}_${safe(d.original_name)}`;
          used.add(name);
          try {
            if (!d.url) throw new Error();
            const r = await fetch(d.url);
            if (!r.ok) throw new Error();
            files[name] = new Uint8Array(await r.arrayBuffer());
          } catch { failed++; }
          done++;
          setProgress(`A transferir ${done}/${docs.length} ficheiros…`);
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));

      setProgress("A criar o ficheiro Excel…");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet((m.records as any[]).map((r) => ({
        "Nº": r.client_number, Nome: r.name, NIF: r.nif, Email: r.email, Telemóvel: r.phone,
        Contacto: r.responsible_name, Morada: r.address, "Código postal": r.postal_code,
        Localidade: r.locality, "Pasta ativa": r.folder_active ? "Sim" : "Não", Observações: r.notes,
      }))), "Clientes");
      XLSX.utils.book_append_sheet(wb, sheet((m.submissions as any[]).map((s) => ({
        Cliente: s.company_name || prof.get(s.user_id)?.full_name, NIF: s.nif, Ano: s.year,
        Mês: MONTHS[s.month - 1], Documentos: s.document_count, "Submetido em": formatDateTimePt(s.submitted_at),
        Responsável: s.responsible_name, Declaração: s.declaration_text,
      }))), "Submissões");
      XLSX.utils.book_append_sheet(wb, sheet((m.requests as any[]).map((u) => ({
        Cliente: u.company_name || prof.get(u.user_id)?.full_name, NIF: u.nif, Ano: u.year,
        Mês: MONTHS[u.month - 1], Estado: u.status, Motivo: u.reason,
        "Pedido em": formatDateTimePt(u.created_at), "Decidido em": u.decided_at ? formatDateTimePt(u.decided_at) : "",
      }))), "Pedidos de desbloqueio");
      XLSX.utils.book_append_sheet(wb, sheet(docs.map((d) => ({
        Cliente: prof.get(d.user_id)?.full_name, NIF: prof.get(d.user_id)?.nif, Ano: d.year,
        Mês: MONTHS[d.month - 1], Pasta: cat.get(d.category) ?? d.category, Ficheiro: d.original_name,
        "Enviado em": formatDateTimePt(d.created_at), "Fora de prazo": d.late ? "Sim" : "Não",
      }))), "Documentos");
      files["Dados.xlsx"] = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
      files["LEIA-ME.txt"] = strToU8(`Cópia de segurança AS Contabilidade\nGerada em ${formatDateTimePt(new Date().toISOString())}\nDocumentos: ${docs.length - failed} de ${docs.length}\n`);

      setProgress("A comprimir o ZIP…");
      const zip = zipSync(files, { level: 0 });
      const label = [
        "Backup",
        cId ? safe(clientName) : "Todos",
        safe(periodLabel.replace(/ · /g, "_").replace(/ /g, "-")),
        formatDatePt(new Date().toISOString()).replace(/\//g, "-"),
      ].filter(Boolean).join("_");
      const blob = new Blob([zip], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${label}.zip`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setProgress(failed ? `Concluído. ${failed} ficheiro(s) não puderam ser transferidos.` : `Concluído: ${docs.length} documento(s) exportados.`);
    } catch (e) {
      setError("Não foi possível criar a cópia de segurança. Tente novamente.");
      setProgress("");
    } finally { setBusy(false); }
  }

  const trig = "h-12 w-full rounded-full border-gold/25 bg-secondary/40 px-5 text-sm hover:border-gold/60 focus:ring-gold/40";
  const content = "max-h-72 rounded-2xl border-gold/20 bg-card p-1 shadow-xl";
  const item = "rounded-xl py-2.5 pl-8 pr-4 focus:bg-gold/15 focus:text-foreground";
  const tab = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors ${on ? "bg-gold text-ink shadow" : "text-muted-foreground hover:text-foreground"}`;
  return (
    <PortalShell title="Cópias de Segurança" subtitle="Exporte dados e documentos num ficheiro ZIP organizado por cliente, ano, mês e pasta.">
      <div className="soft-card mx-auto max-w-3xl space-y-7 p-6 sm:p-8">
        <div className="space-y-2 text-sm">
          <span className="text-muted-foreground">Cliente</span>
          <Select value={clientId} onValueChange={setClientId} disabled={busy}>
            <SelectTrigger className={trig}><SelectValue /></SelectTrigger>
            <SelectContent className={content}>
              <SelectItem className={item} value="all">Todos os clientes</SelectItem>
              {clients.map((c) => <SelectItem className={item} key={c.id} value={c.id}>{c.full_name}{c.nif ? ` (${c.nif})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1 rounded-full border border-gold/20 bg-secondary/40 p-1">
          <button type="button" className={tab(mode === "simple")} onClick={() => setMode("simple")} disabled={busy}>
            <Archive className="h-4 w-4" /> Por ano e mês
          </button>
          <button type="button" className={tab(mode === "range")} onClick={() => setMode("range")} disabled={busy}>
            <CalendarRange className="h-4 w-4" /> Intervalo de datas
          </button>
        </div>

        {mode === "simple" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <span className="text-muted-foreground">Ano</span>
              <Select value={year} onValueChange={setYear} disabled={busy}>
                <SelectTrigger className={trig}><SelectValue /></SelectTrigger>
                <SelectContent className={content}>
                  <SelectItem className={item} value="all">Todos os anos</SelectItem>
                  {years.map((y) => <SelectItem className={item} key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-sm">
              <span className="text-muted-foreground">Mês</span>
              <Select value={month} onValueChange={setMonth} disabled={busy}>
                <SelectTrigger className={trig}><SelectValue /></SelectTrigger>
                <SelectContent className={content}>
                  <SelectItem className={item} value="all">Todos os meses</SelectItem>
                  {MONTHS.map((n, i) => <SelectItem className={item} key={n} value={String(i + 1)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-5 rounded-3xl border border-gold/20 bg-secondary/30 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div><span className="block text-xs text-muted-foreground">De</span><span className="font-serif text-lg text-foreground">{keyLabel(range[0])}</span></div>
              <span className="h-px flex-1 bg-gold/30" />
              <div className="text-right"><span className="block text-xs text-muted-foreground">Até</span><span className="font-serif text-lg text-foreground">{keyLabel(range[1])}</span></div>
            </div>
            <Slider min={minKey} max={maxKey} step={1} minStepsBetweenThumbs={0} value={range}
              onValueChange={(v) => setRange([v[0]!, v[1]!])} disabled={busy} />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              {Array.from({ length: maxKey / 12 - minKey / 12 + 1 }, (_, i) => Math.floor(minKey / 12) + i).map((y) => <span key={y}>{y}</span>)}
            </div>
            <p className="text-xs text-muted-foreground">Arraste os dois pontos para escolher o período: {range[1] - range[0] + 1} mês(es).</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          O ZIP inclui um Excel com clientes, submissões, pedidos de desbloqueio e lista de documentos, e todos os PDFs em pastas. Para arquivos muito grandes, prefira exportar por mês ou por cliente.
        </p>
        <Button onClick={() => setConfirm(true)} disabled={busy} className="h-12 rounded-full px-7">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Descarregar cópia de segurança
        </Button>
        {progress && <p className="text-sm text-gold">{progress}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <ConfirmDialog
        open={confirm}
        icon={<Archive className="h-6 w-6" />}
        title="Criar cópia de segurança?"
        message="Tem a certeza que pretende descarregar esta cópia de segurança? Pode demorar alguns minutos se houver muitos documentos."
        details={<div className="space-y-1 rounded-2xl bg-secondary/50 p-4 text-left text-sm">
          <div><span className="text-muted-foreground">Cliente: </span>{clientName}</div>
          <div><span className="text-muted-foreground">Período: </span>{periodLabel}</div>
        </div>}
        confirmLabel="Descarregar"
        onConfirm={() => void run()}
        onCancel={() => setConfirm(false)}
      />
    </PortalShell>
  );
}
