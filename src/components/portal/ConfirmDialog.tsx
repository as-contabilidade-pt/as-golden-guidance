import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  icon,
  title,
  message,
  details,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  icon?: ReactNode;
  title: string;
  message?: string;
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => {
          if (!busy) onCancel();
        }}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
      />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-ink/10 bg-background p-5 text-center shadow-xl sm:p-7">
        <div className="flex flex-col items-center gap-4">
          <span
            className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
              destructive ? "bg-destructive/15 text-destructive" : "bg-gold/15 text-gold"
            }`}
          >
            {icon}
          </span>
          <h3 className="font-serif text-xl text-foreground">{title}</h3>
          {message ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
          ) : null}
          {details ? <div className="min-w-0 w-full [overflow-wrap:anywhere]">{details}</div> : null}
          <div className="mt-2 flex w-full flex-col-reverse gap-3 sm:flex-row">
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => {
                if (!busy) onCancel();
              }}
              className="h-auto min-h-11 min-w-0 flex-1 whitespace-normal rounded-full border border-ink/15 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={`inline-flex h-auto min-h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-normal rounded-full px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
                destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-gold text-ink hover:bg-gold-deep"
              }`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
