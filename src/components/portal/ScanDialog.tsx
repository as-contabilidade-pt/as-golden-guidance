import { useEffect, useRef, useState } from "react";
import { friendlyError } from "@/lib/friendly-error";
import { Camera, Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";

type Page = { dataUrl: string; width: number; height: number };

const MAX_SIDE = 1600;
const QUALITY = 0.7;

async function compressImage(file: File): Promise<Page> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a fotografia."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Não foi possível abrir a fotografia."));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a fotografia.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return { dataUrl: canvas.toDataURL("image/jpeg", QUALITY), width, height };
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

  useEffect(() => {
    if (open) {
      setPages([]);
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
    try {
      const captured: Page[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Selecione uma fotografia para digitalizar.");
        }
        captured.push(await compressImage(file));
      }
      setPages((prev) =>
        replaceLast && prev.length > 0 ? [...prev.slice(0, -1), ...captured] : [...prev, ...captured],
      );
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-background p-6 shadow-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl text-foreground">Digitalizar documento</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fotografe cada página. As páginas são reunidas num único PDF.
            </p>
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
          <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {pages.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gold/40 px-6 py-10 text-center">
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
          <div className="mt-6 space-y-3">
            {pages.map((page, index) => (
              <div key={index} className="soft-card flex items-center gap-4 p-3">
                <img
                  src={page.dataUrl}
                  alt={`Página ${index + 1}`}
                  className="h-24 w-20 rounded-xl object-cover"
                />
                <p className="flex-1 text-sm text-foreground">Página {index + 1}</p>
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

        <div className="mt-6 flex flex-wrap gap-3">
          {pages.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}
