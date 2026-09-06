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

/** Data em que a pasta de um mês fica bloqueada: dia 11 do mês seguinte. */
export function lockDate(year: number, month: number) {
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  return new Date(y, m - 1, 11, 0, 0, 0, 0);
}

export function isMonthPastDeadline(year: number, month: number, now: Date = new Date()) {
  return now.getTime() >= lockDate(year, month).getTime();
}

export function formatDatePt(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTimePt(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${formatDatePt(d)} ${d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
}

export const DECLARATION_TEXT =
  "Declaro que a entrega de documentação fora do prazo estabelecido pode ter consequências ao nível do cumprimento das obrigações fiscais e/ou contributivas, e assumo essa responsabilidade.";
