import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { listCategories } from "@/lib/portal.functions";

type Category = { id: string; slug: string; label: string };

/** Seleção das pastas (categorias) a que um cliente tem acesso. */
export function CategoryPicker({
  value: raw,
  onChange,
}: {
  /** null = todas as pastas */
  value: string[] | null;
  onChange: (next: string[]) => void;
}) {
  const fetchList = useServerFn(listCategories);
  const [items, setItems] = useState<Category[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setItems((await fetchList({ data: { all: true } })) as unknown as Category[]);
      } catch {
        /* ignore */
      }
    })();
  }, [fetchList]);

  const value = raw ?? items.map((i) => i.slug);

  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-foreground/80">Pastas a que o cliente tem acesso</span>
        <button
          type="button"
          onClick={() => onChange(value.length === items.length ? [] : items.map((i) => i.slug))}
          className="text-xs text-gold hover:underline"
        >
          {value.length === items.length ? "Limpar" : "Selecionar todas"}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((c) => {
          const on = value.includes(c.slug);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.slug)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                on
                  ? "border-gold/60 bg-gold/10 text-foreground"
                  : "border-ink/10 bg-background text-muted-foreground hover:border-gold/30"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  on ? "border-gold bg-gold text-ink" : "border-ink/20"
                }`}
              >
                {on ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
