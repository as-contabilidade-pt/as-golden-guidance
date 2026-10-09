export const CATEGORIES = [
  { slug: "documentos_salarios", label: "Documentos de Salários" },
  { slug: "faturas_despesas", label: "Faturas de Despesas" },
  { slug: "faturas_vendas", label: "Faturas de Vendas" },
  { slug: "faturas_compras", label: "Faturas de Compras de Mercadoria" },
  { slug: "mapas_caixa", label: "Mapas de Caixa" },
  { slug: "extratos_bancarios", label: "Extratos Bancários" },
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

export function categoryLabel(slug: string, categories?: { slug: string; label: string }[]) {
  const list = categories ?? CATEGORIES;
  return list.find((c) => c.slug === slug)?.label ?? slug;
}

/** Texto do campo de identificação adaptado ao tipo de documento. */
export function documentPartyField(slug: string) {
  switch (slug) {
    case "faturas_compras":
      return { label: "Fornecedor", placeholder: "Ex.: EDP" };
    case "faturas_vendas":
      return { label: "Cliente", placeholder: "Ex.: Empresa ABC" };
    case "extratos_bancarios":
      return { label: "Banco", placeholder: "Ex.: Caixa Geral de Depósitos" };
    case "documentos_salarios":
      return { label: "Colaborador", placeholder: "Ex.: Ana Silva" };
    default:
      return { label: "Entidade ou descrição", placeholder: "Ex.: Seguro automóvel" };
  }
}

export function monthLabel(month: number) {
  return MONTHS[month - 1] ?? String(month);
}

/** Data de hoje no formato aceite por <input type="date"> (AAAA-MM-DD). */
export function todayInputValue(now: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Converte AAAA-MM-DD em DD-MM-AAAA (formato usado no nome do documento). */
export function dashedDatePt(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : value;
}

/** Nome completo do documento: "{numero} {fornecedor} {data}" (ex: "05-01 EDP 10-05-2026"). */
export function documentDisplayName(
  label: string,
  supplier?: string | null,
  docDate?: string | null,
) {
  return [label, supplier?.trim() || null, docDate ? dashedDatePt(docDate.slice(0, 10)) : null]
    .filter(Boolean)
    .join(" ");
}


export function availableYears() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 9; y--) years.push(y);
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

/** Horas concedidas para submeter após um desbloqueio aprovado fora do prazo. */
export const UNLOCK_GRACE_HOURS = 72;

/**
 * Fim da janela de um desbloqueio aprovado: se aprovado dentro do prazo, vai até
 * ao prazo normal; se aprovado fora do prazo, 72 h úteis a contar da aprovação.
 */
export function unlockExpiry(year: number, month: number, decidedAt: string | Date) {
  const decided = new Date(decidedAt);
  const limit = lockDate(year, month);
  if (decided.getTime() < limit.getTime()) return limit;
  return addBusinessHours(decided, UNLOCK_GRACE_HOURS);
}

const HOUR = 3600 * 1000;

/** Sábado/domingo em Portugal (Europe/Lisbon). */
function isWeekendLisbon(d: Date) {
  const wd = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Lisbon" }).format(d);
  return wd === "Sat" || wd === "Sun";
}

/** Soma horas úteis (ignora sábados e domingos). */
export function addBusinessHours(start: Date, hours: number) {
  let t = start.getTime();
  let left = hours;
  let guard = 0;
  while (left > 0 && guard++ < 10000) {
    t += HOUR;
    if (!isWeekendLisbon(new Date(t - 1))) left--;
  }
  return new Date(t);
}

/** Milissegundos úteis entre agora e o fim (ignora fins de semana). */
export function businessMsUntil(end: Date, now: Date = new Date()) {
  let t = now.getTime();
  const e = end.getTime();
  let ms = 0;
  while (t < e) {
    const step = Math.min(HOUR - (t % HOUR) || HOUR, e - t);
    if (!isWeekendLisbon(new Date(t))) ms += step;
    t += step;
  }
  return ms;
}

/**
 * Diz se um desbloqueio aprovado concedeu a janela extra de 72 h (aprovação fora
 * do prazo). Aprovações dentro do prazo não têm contagem decrescente: vão até ao
 * prazo normal.
 */
export function unlockIsGrace(year: number, month: number, decidedAt: string | Date) {
  return new Date(decidedAt).getTime() >= lockDate(year, month).getTime();
}

export function unlockIsActive(
  year: number,
  month: number,
  decidedAt: string | Date | null | undefined,
  now: Date = new Date(),
) {
  if (!decidedAt) return true;
  return now.getTime() < unlockExpiry(year, month, decidedAt).getTime();
}

export function formatDatePt(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Lisbon" });
}

export function formatDateTimePt(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${formatDatePt(d)} ${d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" })}`;
}

/* --------------------------- Textos oficiais --------------------------- */

export const DECLARATION_TEXT =
  "Solicito a reabertura do período de submissão de documentos acima identificado, para entrega ou correção de documentação. Declaro ter conhecimento de que, caso a entrega ocorra após o prazo previsto no contrato de prestação de serviços, poderão existir consequências daí decorrentes, nomeadamente de natureza contratual, contabilística e fiscal.";

export const DECLARATION_CHECKBOX =
  "Confirmo que tomei conhecimento e solicito a reabertura do período.";

export const SUBMISSION_DECLARATION_TEXT =
  "Declaro que concluí a submissão da documentação referente ao período acima indicado e que, tanto quanto é do meu conhecimento, foram entregues todos os documentos e informações necessários ao processamento da contabilidade, não tendo sido omitido ou ocultado qualquer elemento relevante. Declaro ainda ter conhecimento da obrigação de conservar os documentos originais nos termos e pelos prazos legalmente aplicáveis.";

export const SUBMISSION_DECLARATION_CHECKBOX =
  "Confirmo a conclusão da entrega e as declarações acima.";

export type DeclarationFields = {
  nif: string;
  companyName: string;
  responsibleName: string;
  year: number;
  month: number;
  at: string | Date;
};

/** Texto integral da declaração de pedido de reabertura, para registo e comprovativo. */
export function buildUnlockDeclaration(f: DeclarationFields) {
  return [
    `NIF DA EMPRESA: ${f.nif || "—"}`,
    `NOME DA EMPRESA: ${f.companyName || "—"}`,
    `NOME DO RESPONSÁVEL: ${f.responsibleName || "—"}`,
    `PERÍODO A REABRIR: ${monthLabel(f.month)}/${f.year}`,
    "",
    DECLARATION_TEXT,
    "",
    `[X] ${DECLARATION_CHECKBOX}`,
    "",
    `DATA E HORA DO PEDIDO: ${formatDateTimePt(f.at)}`,
  ].join("\n");
}

/** Texto integral da declaração de conclusão da entrega, para registo e comprovativo. */
export function buildSubmissionDeclaration(f: DeclarationFields) {
  return [
    `NIF DA EMPRESA: ${f.nif || "—"}`,
    `NOME DA EMPRESA: ${f.companyName || "—"}`,
    `NOME DO RESPONSÁVEL: ${f.responsibleName || "—"}`,
    `PERÍODO: ${monthLabel(f.month)}/${f.year}`,
    "",
    "DECLARAÇÃO DE CONCLUSÃO DA ENTREGA",
    SUBMISSION_DECLARATION_TEXT,
    "",
    `[X] ${SUBMISSION_DECLARATION_CHECKBOX}`,
    "",
    `DATA E HORA DA SUBMISSÃO: ${formatDateTimePt(f.at)}`,
  ].join("\n");
}

export const REMINDER_SUBJECT = "Lembrete - Prazo de entrega de documentação";

export const REMINDER_BODY = [
  "Caro cliente,",
  "",
  "Recordamos que dia 10 é o último dia para disponibilizar as faturas e restante documentação contabilística referente ao mês anterior.",
  "",
  "Caso ainda não tenha procedido ao envio ou disponibilização da documentação, solicitamos que o faça com a maior brevidade possível.",
  "",
  "Caso a documentação já tenha sido disponibilizada, agradecemos que desconsidere esta mensagem, a qual é enviada automaticamente.",
  "",
  "AS | Contabilidade, Fiscalidade e Gestão",
].join("\n");
