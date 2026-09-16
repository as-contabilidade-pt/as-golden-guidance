import {
  monthLabel,
  formatDateTimePt,
  REMINDER_SUBJECT,
  REMINDER_BODY,
} from "@/lib/portal";

type SubmissionInfo = {
  fullName: string;
  nif: string;
  email?: string;
  year: number;
  month: number;
  submittedAt: string;
  documentCount: number;
  declarationText: string;
};

type UnlockDecisionInfo = {
  fullName: string;
  nif: string;
  email?: string;
  year: number;
  month: number;
  reason: string;
  decision: "aprovado" | "rejeitado" | "fechado";
  decidedAt: string;
  declarationText: string;
};

async function adminEmails() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
  if (ids.length === 0) return [];
  const { data: admins } = await supabaseAdmin.from("profiles").select("email").in("id", ids);
  return (admins ?? [])
    .map((a: { email: string | null }) => a.email)
    .filter((e): e is string => Boolean(e));
}

/**
 * Envia (ou registra) um email transacional.
 * O envio real fica ativo assim que o domínio de email do projeto estiver
 * configurado; até lá, o conteúdo é registado nos registos do servidor.
 */
async function deliver(to: string[], subject: string, body: string) {
  const recipients = Array.from(new Set(to.filter(Boolean)));
  for (const address of recipients) {
    console.log(`[email] para ${address} :: ${subject}\n${body}`);
  }
}

/** Notifica a administradora de uma nova submissão de documentação. */
export async function notifyAdminOfSubmission(info: SubmissionInfo) {
  const to = await adminEmails();
  if (to.length === 0) return;

  await deliver(
    to,
    `Nova submissão de documentação - ${info.fullName}`,
    [
      `Cliente: ${info.fullName}`,
      `NIF: ${info.nif}`,
      `Documentação: ${monthLabel(info.month)} ${info.year}`,
      `Data/hora da submissão: ${formatDateTimePt(info.submittedAt)}`,
      `Total de documentos submetidos: ${info.documentCount}`,
      "",
      "DECLARAÇÃO REGISTADA PELO CLIENTE",
      info.declarationText,
    ].join("\n"),
  );
}

/** Confirma ao cliente a submissão da documentação do mês. */
export async function notifyClientOfSubmission(info: SubmissionInfo) {
  if (!info.email) return;

  await deliver(
    [info.email],
    `Confirmação de submissão de documentação - ${monthLabel(info.month)} ${info.year}`,
    [
      `Olá ${info.fullName},`,
      "",
      `Confirmamos a receção da sua documentação de ${monthLabel(info.month)} ${info.year}.`,
      `Data/hora da submissão: ${formatDateTimePt(info.submittedAt)}`,
      `Número de documentos submetidos: ${info.documentCount}`,
      "",
      "DECLARAÇÃO REGISTADA",
      info.declarationText,
      "",
      "AS | Contabilidade, Fiscalidade e Gestão",
    ].join("\n"),
  );
}

/** Comprovativo da decisão de um pedido de desbloqueio, para cliente e administradora. */
export async function notifyUnlockDecision(info: UnlockDecisionInfo) {
  const resultado =
    info.decision === "aprovado"
      ? "Aprovado"
      : info.decision === "rejeitado"
        ? "Rejeitado"
        : "Pasta novamente bloqueada";

  const body = [
    `Cliente: ${info.fullName}`,
    `NIF: ${info.nif}`,
    `Pasta: ${monthLabel(info.month)} ${info.year}`,
    `Motivo indicado pelo cliente: ${info.reason}`,
    "",
    "DECLARAÇÃO REGISTADA PELO CLIENTE",
    info.declarationText,
    "",
    `Resultado: ${resultado}`,
    `Data/hora da decisão: ${formatDateTimePt(info.decidedAt)}`,
    "",
    "AS | Contabilidade, Fiscalidade e Gestão",
  ].join("\n");

  const to = [...(await adminEmails()), ...(info.email ? [info.email] : [])];
  if (to.length === 0) return;

  await deliver(
    to,
    `Pedido de reabertura ${resultado.toLowerCase()} - ${monthLabel(info.month)} ${info.year}`,
    body,
  );
}

/** Lembrete do dia 8 para todos os clientes com pasta de submissão ativa. */
export async function sendMonthlyReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("client_records")
    .select("email, name")
    .eq("folder_active", true);
  if (error) throw new Error(error.message);

  const recipients = (rows ?? [])
    .map((r: { email: string | null }) => (r.email ?? "").trim())
    .filter((e: string) => e.includes("@"));

  for (const address of recipients) {
    await deliver([address], REMINDER_SUBJECT, REMINDER_BODY);
  }

  return { sent: recipients.length };
}
