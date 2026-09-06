import { monthLabel, formatDateTimePt } from "@/lib/portal";

type SubmissionInfo = {
  fullName: string;
  nif: string;
  year: number;
  month: number;
  submittedAt: string;
  documentCount: number;
};

/**
 * Notifica a administradora de uma nova submissão de documentação.
 * O envio real de email fica ativo assim que o domínio de email do projeto
 * estiver configurado; até lá, o evento fica registado nos registos do servidor.
 */
export async function notifyAdminOfSubmission(info: SubmissionInfo) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: adminRoles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  const ids = (adminRoles ?? []).map((r: { user_id: string }) => r.user_id);
  if (ids.length === 0) return;

  const { data: admins } = await supabaseAdmin.from("profiles").select("email").in("id", ids);

  const subject = `Nova submissão de documentação - ${info.fullName}`;
  const body = [
    `Cliente: ${info.fullName}`,
    `NIF: ${info.nif}`,
    `Documentação: ${monthLabel(info.month)} ${info.year}`,
    `Data/hora da submissão: ${formatDateTimePt(info.submittedAt)}`,
    `Total de documentos submetidos: ${info.documentCount}`,
  ].join("\n");

  for (const a of admins ?? []) {
    console.log(`[submissao] para ${(a as { email: string }).email} :: ${subject}\n${body}`);
  }
}
