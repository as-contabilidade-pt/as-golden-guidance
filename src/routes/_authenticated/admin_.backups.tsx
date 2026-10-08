import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zipSync, strToU8 } from "fflate";
import * as XLSX from "xlsx";
import { Download, Loader2 } from "lucide-react";
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
  const [clientId, setClientId] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { fetchClients().then(setClients).catch(() => {}); }, [fetchClients]);

  const nowY = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => nowY + 1 - i);

  async function run() {
    setBusy(true); setError(""); setProgress("A preparar a lista de ficheiros…");
    try {
      const m = await fetchManifest({ data: {
        clientId: clientId || undefined,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
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
        clientId ? safe(clients.find((c) => c.id === clientId)?.full_name ?? "") : "Todos",
        year || "", month ? MONTHS[Number(month) - 1] : "",
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

  const sel = "h-11 w-full rounded-full border border-border bg-background px-4 text-sm";
  return (
    <PortalShell title="Cópias de Segurança" subtitle="Exporte dados e documentos num ficheiro ZIP organizado por cliente, ano, mês e pasta.">
      <div className="soft-card mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Cliente</span>
            <select className={sel} value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={busy}>
              <option value="">Todos os clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.nif ? ` (${c.nif})` : ""}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Ano</span>
            <select className={sel} value={year} onChange={(e) => setYear(e.target.value)} disabled={busy}>
              <option value="">Todos os anos</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Mês</span>
            <select className={sel} value={month} onChange={(e) => setMonth(e.target.value)} disabled={busy}>
              <option value="">Todos os meses</option>
              {MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          O ZIP inclui um Excel com clientes, submissões, pedidos de desbloqueio e lista de documentos, e todos os PDFs em pastas. Para arquivos muito grandes, prefira exportar por mês ou por cliente.
        </p>
        <Button onClick={run} disabled={busy} className="h-11 rounded-full px-6">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Descarregar cópia de segurança
        </Button>
        {progress && <p className="text-sm text-gold">{progress}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </PortalShell>
  );
}
