import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zipSync } from "fflate";
import { Archive, Loader2 } from "lucide-react";
import { buildBackupManifest } from "@/lib/backup.functions";
import { MONTHS } from "@/lib/portal";

const safe = (s: string) => (s || "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "sem-nome";
const pad = (n: number) => String(n).padStart(2, "0");

type Scope = { label: string; year?: number; month?: number; category?: string; part: string };

/**
 * Barra (só para administração) que descarrega documentos em ZIP:
 * por pasta, por mês, por ano ou de todo o cliente.
 */
export function ZipDownloadBar({
  clientId,
  year,
  month,
  category,
  categoryLabel,
}: {
  clientId: string;
  year: number;
  month: number | null;
  category: string | null;
  categoryLabel?: string | undefined;
}) {
  const fetchManifest = useServerFn(buildBackupManifest);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const scopes: Scope[] = [];
  if (month !== null && category !== null)
    scopes.push({ label: "Descarregar esta pasta (ZIP)", year, month, category, part: `${year}_${pad(month)}_${safe(categoryLabel ?? category)}` });
  if (month !== null)
    scopes.push({ label: `Descarregar ${MONTHS[month - 1]} ${year} (ZIP)`, year, month, part: `${year}_${pad(month)}` });
  scopes.push({ label: `Descarregar ${year} (ZIP)`, year, part: `${year}` });
  scopes.push({ label: "Descarregar todo o cliente (ZIP)", part: "Tudo" });

  async function run(s: Scope) {
    setBusy(s.label);
    setMsg("A preparar a lista de ficheiros…");
    try {
      const m = await fetchManifest({
        data: { clientId, year: s.year, month: s.month, category: s.category },
      });
      const docs = m.documents as any[];
      if (docs.length === 0) {
        setMsg("Não há documentos para descarregar neste âmbito.");
        return;
      }
      const prof = (m.profiles as any[]).find((p) => p.id === clientId);
      const cat = new Map((m.categories as any[]).map((c) => [c.slug, c.label]));
      const files: Record<string, Uint8Array> = {};
      const used = new Set<string>();
      let done = 0;
      let failed = 0;
      const queue = [...docs];
      const worker = async () => {
        while (queue.length) {
          const d = queue.shift()!;
          const folder = `${d.year}/${pad(d.month)} - ${MONTHS[d.month - 1]}/${safe(cat.get(d.category) ?? d.category)}`;
          let name = `${folder}/${safe(d.original_name)}`;
          let k = 2;
          while (used.has(name)) name = `${folder}/${k++}_${safe(d.original_name)}`;
          used.add(name);
          try {
            if (!d.url) throw new Error();
            const r = await fetch(d.url);
            if (!r.ok) throw new Error();
            files[name] = new Uint8Array(await r.arrayBuffer());
          } catch {
            failed++;
          }
          done++;
          setMsg(`A transferir ${done}/${docs.length} ficheiros…`);
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
      const zip = zipSync(files, { level: 0 });
      const blob = new Blob([zip as BlobPart], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safe(prof?.full_name ?? "Cliente")}_${s.part}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setMsg(
        failed
          ? `Concluído. ${failed} ficheiro(s) não puderam ser transferidos.`
          : `Concluído: ${docs.length} documento(s) descarregados.`,
      );
    } catch {
      setMsg("Não foi possível criar o ZIP. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {scopes.map((s) => (
        <button
          key={s.label}
          type="button"
          disabled={busy !== null}
          onClick={() => void run(s)}
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {busy === s.label ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          {s.label}
        </button>
      ))}
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
