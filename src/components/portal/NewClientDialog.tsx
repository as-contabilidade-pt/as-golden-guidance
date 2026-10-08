import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/portal.functions";
import { CategoryPicker } from "@/components/portal/CategoryPicker";

export function NewClientDialog({
  onCreated,
}: {
  onCreated?: (email: string) => void | Promise<void>;
}) {
  const addClient = useServerFn(createClient);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (categories.length === 0) {
      setError("Selecione pelo menos uma pasta para este cliente.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addClient({
        data: {
          fullName,
          nif,
          email,
          categories,
          redirectTo: `${window.location.origin}/definir-password`,
        },
      });
      const sent = email;
      setFullName("");
      setNif("");
      setEmail("");
      setCategories([]);
      setOpen(false);
      await onCreated?.(sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o cliente.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors focus:border-gold/50 focus:ring-1 focus:ring-gold/30";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
      >
        <Plus className="h-4 w-4" /> Novo cliente
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Novo cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            {(
              [
                ["Nome completo", fullName, setFullName, "text"],
                ["NIF", nif, setNif, "text"],
                ["Email", email, setEmail, "email"],
              ] as const
            ).map(([label, value, set, type]) => (
              <label key={label} className="block">
                <span className="mb-2 block text-xs font-medium text-foreground/80">{label}</span>
                <input
                  required
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className={input}
                />
              </label>
            ))}
            <CategoryPicker value={categories} onChange={setCategories} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar conta e enviar convite
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
