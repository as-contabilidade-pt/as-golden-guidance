export const CATEGORIES = [
  { slug: "faturas_compras", label: "Faturas de Compras" },
  { slug: "faturas_vendas", label: "Faturas de Vendas" },
  { slug: "extratos_bancarios", label: "Extratos Bancários" },
  { slug: "documentos_salarios", label: "Documentos de Salários" },
  { slug: "outros_documentos", label: "Outros Documentos" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function categoryLabel(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function monthLabel(month: number) {
  return MONTHS[month - 1] ?? String(month);
}

export function availableYears() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 4; y--) years.push(y);
  return years;
}
