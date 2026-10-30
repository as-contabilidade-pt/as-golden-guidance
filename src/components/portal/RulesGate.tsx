import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRulesStatus, acceptRules } from "@/lib/portal.functions";
import {
  RULES_INTRO,
  RULES_ITEMS,
  RULES_FOOTER,
  RULES_ACCEPT_CHECKBOX,
} from "@/lib/portal";

function RulesList() {
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">{RULES_INTRO}</p>
      <ol className="mt-3 space-y-3 text-left text-sm leading-relaxed text-foreground">
        {RULES_ITEMS.map((r, i) => (
          <li key={r.title} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
              {i + 1}
            </span>
            <span>
              <strong>{r.title}.</strong> {r.text}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{RULES_FOOTER}</p>
    </>
  );
}

/** Aviso permanente (recolhido) com as regras, na página de documentos do cliente. */
export function RulesNotice() {
  return (
    <details className="soft-card group mb-6 px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground">
        <span className="inline-flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-gold" /> Regras de entrega de documentação
          <span className="text-muted-foreground font-normal">
            · prazo: até ao dia 10 do mês seguinte
          </span>
        </span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4">
        <RulesList />
      </div>
    </details>
  );
}

/** Janela obrigatória: o cliente tem de aceitar as regras antes de usar a área de documentos. */
export function RulesGate() {
  const fetchStatus = useServerFn(getRulesStatus);
  const accept = useServerFn(acceptRules);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const s = (await fetchStatus()) as { required: boolean; accepted: boolean };
        setOpen(s.required && !s.accepted);
      } catch {
        setOpen(false);
      }
    })();
  }, [fetchStatus]);

  if (!open) return null;

  const onAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      await accept();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registar a aceitação.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Regras de entrega de documentação"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-3xl border border-ink/10 bg-background p-5 shadow-xl sm:p-7"
      >
        <h3 className="font-serif text-xl text-foreground">Regras de entrega de documentação</h3>
        <div className="mt-4">
          <RulesList />
        </div>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--gold,#c9a227)]"
          />
          <span>{RULES_ACCEPT_CHECKBOX}</span>
        </label>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button
          type="button"
          disabled={!checked || busy}
          onClick={() => void onAccept()}
          className="mt-5 h-auto min-h-11 w-full rounded-full bg-gold px-4 py-3 text-sm font-medium text-ink hover:bg-gold-deep disabled:opacity-50"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continuar
        </Button>
      </div>
    </div>
  );
}
