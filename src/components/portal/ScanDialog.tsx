import { useEffect, useRef, useState } from "react";
import { friendlyError } from "@/lib/friendly-error";
import { Camera, Loader2, Plus, RotateCcw, Trash2, X, ZoomIn } from "lucide-react";
import { ScanPageEditor, type EditResult } from "@/components/portal/ScanPageEditor";
import { FULL_QUAD, loadImage, renderScan, type Quad, type ScanSource } from "@/lib/scan-image";

/** `dataUrl` é a página final (já endireitada) que vai para o PDF; `source` é a foto original, para reajustar. */
type Page = {
  dataUrl: string;
  width: number;
  height: number;
  source: ScanSource;
  quad: Quad;
  filter: boolean;
};

const SOURCE_MAX_SIDE = 2400;
const SOURCE_QUALITY = 0.85;

async function compressImage(file: File): Promise<Page> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a fotografia."));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);

  // Foto original (reduzida) guardada para poder reenquadrar; depois a página final.
  const sScale = Math.min(1, SOURCE_MAX_SIDE / Math.max(img.width, img.height));
  const sWidth = Math.max(1, Math.round(img.width * sScale));
  const sHeight = Math.max(1, Math.round(img.height * sScale));
  const sCanvas = document.createElement("canvas");
  sCanvas.width = sWidth;
  sCanvas.height = sHeight;
  const sCtx = sCanvas.getContext("2d");
  if (!sCtx) throw new Error("Não foi possível processar a fotografia.");
  sCtx.fillStyle = "#ffffff";
  sCtx.fillRect(0, 0, sWidth, sHeight);
  sCtx.drawImage(img, 0, 0, sWidth, sHeight);
  const source: ScanSource = {
    dataUrl: sCanvas.toDataURL("image/jpeg", SOURCE_QUALITY),
    width: sWidth,
    height: sHeight,
  };

  const page = await renderScan(source, FULL_QUAD, false);
  return { ...page, source, quad: FULL_QUAD, filter: false };
}

function scanFileName() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `digitalizacao-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours(),
  )}${p(d.getMinutes())}.pdf`;
}

export function ScanDialog({
  open,
  onClose,
  onReady,
}: {
  open: boolean;
  onClose: () => void;
  onReady: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [replaceLast, setReplaceLast] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setPages([]);
      setEditingIndex(null);
      setError(null);
      setWorking(false);
      setReplaceLast(false);
      // abrir a câmara imediatamente
      const t = setTimeout(() => inputRef.current?.click(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  async function handleCapture(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setWorking(true);
    const targetIndex = replaceLast && pages.length > 0 ? pages.length - 1 : pages.length;
    try {
      const captured: Page[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Selecione uma fotografia para digitalizar.");
        }
        captured.push(await compressImage(file));
      }
      setPages((prev) =>
        replaceLast && prev.length > 0
          ? [...prev.slice(0, -1), ...captured]
          : [...prev, ...captured],
      );
      // Abre logo o ajuste da página acabada de fotografar (enquadrar e ampliar).
      setEditingIndex(targetIndex);
    } catch (e) {
      setError(
        friendlyError(e, "É necessário autorizar o acesso à câmara para digitalizar documentos."),
      );
    } finally {
      setReplaceLast(false);
      setWorking(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleApplyEdit(result: EditResult) {
    if (editingIndex === null) return;
    const current = pages[editingIndex];
    if (!current) return;
    setWorking(true);
    setError(null);
    try {
      // deixa o botão mostrar «A aplicar…» antes do cálculo pesado
      await new Promise((r) => setTimeout(r, 30));
      const next = await renderScan(result.source, result.quad, result.filter);
      setPages((prev) =>
        prev.map((p, i) =>
          i === editingIndex
            ? { ...p, ...next, source: result.source, quad: result.quad, filter: result.filter }
            : p,
        ),
      );
      setEditingIndex(null);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível aplicar o ajuste."));
    } finally {
      setWorking(false);
    }
  }

  async function handleConfirm() {
    if (pages.length === 0) return;
    setWorking(true);
    setError(null);
    try {
      const { default: JsPDF } = await import("jspdf");
      const pdf = new JsPDF({ unit: "pt", format: "a4", compress: true });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      pages.forEach((page, index) => {
        if (index > 0) pdf.addPage();
        const scale = Math.min(pw / page.width, ph / page.height);
        const w = page.width * scale;
        const h = page.height * scale;
        pdf.addImage(page.dataUrl, "JPEG", (pw - w) / 2, (ph - h) / 2, w, h, undefined, "FAST");
      });

      const blob = pdf.output("blob");
      const file = new File([blob], scanFileName(), { type: "application/pdf" });
      await onReady(file);
      onClose();
    } catch (e) {
      setError(friendlyError(e, "Não foi possível gerar o PDF."));
    } finally {
      setWorking(false);
    }
  }

  if (!open) return null;

  const editingPage = editingIndex !== null ? (pages[editingIndex] ?? null) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className={`flex w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-background p-4 shadow-xl sm:rounded-3xl sm:p-6 ${
          editingPage ? "h-[92dvh]" : "max-h-[92dvh]"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl text-foreground">
              {editingPage ? `Ajustar página ${editingIndex! + 1}` : "Digitalizar documento"}
            </h3>
            {editingPage ? null : (
              <p className="mt-1 text-sm text-muted-foreground">
                Fotografe cada página. As páginas são reunidas num único PDF.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full bg-secondary p-2 text-foreground transition-colors hover:text-gold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleCapture(e.target.files)}
        />

        {error && (
          <p className="mt-3 shrink-0 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {editingPage ? (
          <ScanPageEditor
            key={editingIndex}
            source={editingPage.source}
            initialQuad={editingPage.quad}
            initialFilter={editingPage.filter}
            working={working}
            onApply={(result) => void handleApplyEdit(result)}
            onCancel={() => setEditingIndex(null)}
          />
        ) : pages.length === 0 ? (
          <div className="mt-6 overflow-y-auto rounded-2xl border border-dashed border-gold/40 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {working ? "A preparar a fotografia…" : "Nenhuma página capturada."}
            </p>
            <button
              type="button"
              disabled={working}
              onClick={() => inputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              Tirar fotografia
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Melhor no telemóvel: a câmara abre diretamente.
            </p>
          </div>
        ) : (
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
            {pages.map((page, index) => (
              <div key={index} className="soft-card flex items-center gap-4 p-3">
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setEditingIndex(index)}
                  aria-label={`Ajustar e ampliar página ${index + 1}`}
                  className="shrink-0 disabled:opacity-50"
                >
                  <img
                    src={page.dataUrl}
                    alt={`Página ${index + 1}`}
                    className="h-24 w-20 rounded-xl bg-white object-contain"
                  />
                </button>
                <p className="flex-1 text-sm text-foreground">Página {index + 1}</p>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setEditingIndex(index)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:text-gold disabled:opacity-50"
                >
                  <ZoomIn className="h-4 w-4" />
                  Ajustar e ampliar
                </button>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setPages((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remover página ${index + 1}`}
                  className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {pages.length > 0 && !editingPage && (
          <div className="mt-4 grid shrink-0 gap-3 sm:flex sm:flex-wrap">
            <>
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  setReplaceLast(false);
                  inputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-gold px-5 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar página
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  setReplaceLast(true);
                  inputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:text-gold disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Repetir última
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => void handleConfirm()}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {working ? "A preparar PDF…" : "Confirmar e gerar PDF"}
              </button>
            </>
          </div>
        )}
      </div>
    </div>
  );
}
