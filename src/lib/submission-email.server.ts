import { getRequest } from "@tanstack/react-start/server";
import {
  monthLabel,
  formatDateTimePt,
  REMINDER_SUBJECT,
  REMINDER_BODY,
  unlockExpiry,
} from "@/lib/portal";
import { isMonthlySubmissionTime } from "@/lib/vercel-cron.server";

/** Endereço do portal nos emails: SITE_URL (obrigatório em produção), senão a origem do pedido (nunca lovable.app). */
const FALLBACK_SITE = "https://as-contabilidade.pt";
function siteBaseUrl(): string {
  const env = process.env["SITE_URL"];
  if (env && !/lovable\.app/.test(env)) return env;
  try {
    const req = getRequest();
    const origin = req?.headers.get("origin") || (req ? new URL(req.url).origin : "");
    if (origin && !/lovable\.app|localhost/.test(origin)) return origin;
  } catch {
    /* sem pedido (ex.: tarefa agendada) */
  }
  return FALLBACK_SITE;
}

type SubmissionInfo = {
  fullName: string;
  nif: string;
  email?: string;
  year: number;
  month: number;
  submittedAt: string;
  documentCount: number;
  declarationText: string;
  automatic?: boolean;
};

type UnlockDecisionInfo = {
  fullName: string;
  nif: string;
  adminNote?: string;
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
 * Modo de teste: enquanto estiver definido, todos os emails são encaminhados
 * apenas para este endereço (em vez dos destinatários reais).
 */
const TEST_EMAIL_OVERRIDE = "";

/**
 * Envia (ou registra) um email transacional.
 * O envio real fica ativo assim que o domínio de email do projeto estiver
 * configurado; até lá, o conteúdo é registado nos registos do servidor.
 */
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


/** Converte o texto do email no modelo visual da marca (cabeçalho preto/dourado). */
function brandHtml(title: string, body: string, admin = false) {
  const lines = body.split("\n").filter((l) => l.trim() !== "AS | Contabilidade, Fiscalidade e Gestão");
  const declIdx = lines.findIndex((l) => /^(DECLARAÇÃO|REGISTO DA SUBMISSÃO AUTOMÁTICA)/.test(l.trim()));
  const main = declIdx >= 0 ? lines.slice(0, declIdx) : lines;
  const decl = declIdx >= 0 ? lines.slice(declIdx) : [];

  const mainHtml = main
    .map((l) => {
      if (!l.trim()) return "";
      const m = l.match(/^([^:]{2,40}):\s(.*)$/);
      if (m) return `<p style="margin:4px 0;"><strong>${esc(m[1] ?? "")}:</strong> ${esc(m[2] ?? "")}</p>`;
      return `<p style="margin:12px 0;">${esc(l)}</p>`;
    })
    .join("");

  const declHtml = decl.length
    ? `<div style="margin:24px 0;padding:16px;background:#faf7ef;border-left:3px solid #c9a227;border-radius:4px;">
         <p style="margin:0 0 8px;font-weight:bold;color:#0a0a0a;font-size:13px;letter-spacing:.5px;">${esc(decl[0] ?? "")}</p>
         <div style="white-space:pre-wrap;color:#444;font-size:12px;line-height:1.6;">${esc(decl.slice(1).join("\n").trim())}</div>
       </div>`
    : "";

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.5;max-width:600px;margin:0 auto;">
  <div style="background-color:#0a0a0a;padding:24px;text-align:center;">
    <span style="color:#c9a227;font-size:20px;font-weight:bold;letter-spacing:1px;">AS | CONTABILIDADE</span>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#0a0a0a;">${esc(title)}</h2>
    ${mainHtml}
    ${declHtml}
    <p style="margin:24px 0;">
      <a href="${esc(siteBaseUrl().replace(/\/$/, "") + "/" + (admin ? "admin" : "login"))}" style="background-color:#c9a227;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">${admin ? "Ver no Painel de Administração" : "Aceder ao Portal"}</a>
    </p>
    ${admin ? '<p style="color:#888;font-size:12px;font-style:italic;">Notificação automática do Portal AS Contabilidade</p>' : "<p>Com os melhores cumprimentos,<br><strong>Equipa AS Contabilidade</strong></p>"}
  </div>
</div>`;
}

async function deliver(to: string[], subject: string, body: string, title = subject, admin = false, idempotencyKey?: string, countsOnly = false): Promise<boolean> {
  const original = Array.from(new Set(to.filter(Boolean)));
  if (original.length === 0) return false;
  let ok = true;
  const recipients = TEST_EMAIL_OVERRIDE ? [TEST_EMAIL_OVERRIDE] : original;
  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['RESEND_FROM'] || "AS Contabilidade <onboarding@resend.dev>";
  const finalSubject = TEST_EMAIL_OVERRIDE
    ? `${subject} [teste → ${original.join(", ")}]`
    : subject;
  const text = admin ? `${body}\n\n— Notificação automática do Portal AS Contabilidade` : `${body}\n\nCom os melhores cumprimentos,\nEquipa AS Contabilidade`;
  const html = brandHtml(title, body, admin);

  for (const address of recipients) {
    if (!apiKey) {
      if (countsOnly) { ok = false; continue; }
      console.log(`[email] (sem RESEND_API_KEY) para ${address} :: ${finalSubject}\n${text}`);
      continue;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({ from, to: [address], subject: finalSubject, text, html }),
      });
      if (!res.ok) {
        ok = false;
        if (!countsOnly) console.error(`[email] Resend falhou (${res.status}): ${await res.text()}`);
      }
    } catch (e) {
      ok = false;
      if (!countsOnly) console.error("[email] erro ao enviar", e);
    }
  }
  return ok;
}


/** Notifica a administradora de uma nova submissão de documentação. */
export async function notifyAdminOfSubmission(info: SubmissionInfo) {
  const to = await adminEmails();
  if (to.length === 0) return;

  await deliver(
    to,
    `${info.automatic ? "Submissão automática de documentação" : "Nova submissão de documentação"} - ${info.fullName}`,
    [
      `Cliente: ${info.fullName}`,
      `NIF: ${info.nif}`,
      `Documentação: ${monthLabel(info.month)} ${info.year}`,
      `Data/hora da submissão: ${formatDateTimePt(info.submittedAt)}`,
      `Total de documentos submetidos: ${info.documentCount}`,
      "",
      info.automatic ? "REGISTO DA SUBMISSÃO AUTOMÁTICA" : "DECLARAÇÃO REGISTADA PELO CLIENTE",
      info.declarationText,
    ].join("\n"),
    "Nova submissão de documentação",
    true,
  );
}

/** Confirma ao cliente a submissão da documentação do mês. */
export async function notifyClientOfSubmission(info: SubmissionInfo) {
  if (!info.email) return;

  await deliver(
    [info.email],
    `${info.automatic ? "Documentação submetida automaticamente" : "Confirmação de submissão de documentação"} - ${monthLabel(info.month)} ${info.year}`,
    [
      `Olá ${info.fullName},`,
      "",
      info.automatic
        ? "O prazo terminou e a documentação que anexou foi submetida automaticamente. Nos termos das Condições do portal, considera-se prestada, por decurso do prazo, a declaração de conclusão da entrega. Se faltar algum documento, contacte-nos."
        : `Confirmamos a receção da sua documentação de ${monthLabel(info.month)} ${info.year}.`,
      `Data/hora da submissão: ${formatDateTimePt(info.submittedAt)}`,
      `Número de documentos submetidos: ${info.documentCount}`,
      "",
      info.automatic ? "REGISTO DA SUBMISSÃO AUTOMÁTICA" : "DECLARAÇÃO REGISTADA",
      info.declarationText,
      "",
      "AS | Contabilidade, Fiscalidade e Gestão",
    ].join("\n"),
    "Documentação recebida",
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
    ...(info.adminNote ? [`Nota da AS Contabilidade: ${info.adminNote}`] : []),
    ...(info.decision === "aprovado"
      ? [`Prazo para submeter: até ${formatDateTimePt(unlockExpiry(info.year, info.month, info.decidedAt))}`]
      : []),
    "",
    "AS | Contabilidade, Fiscalidade e Gestão",
  ].join("\n");

  const to = [...(await adminEmails()), ...(info.email ? [info.email] : [])];
  if (to.length === 0) return;

  await deliver(
    to,
    `Pedido de reabertura ${resultado.toLowerCase()} - ${monthLabel(info.month)} ${info.year}`,
    body,
    `Pedido de reabertura: ${resultado}`,
  );
}

/** Avisa cliente e administradora de que foi pedido o desbloqueio de uma pasta. */
export async function notifyUnlockRequested(info: {
  fullName: string;
  nif: string;
  email?: string;
  year: number;
  month: number;
  reason: string;
  requestedAt: string;
}) {
  const period = `${monthLabel(info.month)} ${info.year}`;
  const admins = await adminEmails();
  if (admins.length > 0) {
    await deliver(
      admins,
      `Novo pedido de desbloqueio - ${info.fullName} - ${period}`,
      [
        `Cliente: ${info.fullName}`,
        `NIF: ${info.nif}`,
        `Pasta: ${period}`,
        `Data/hora do pedido: ${formatDateTimePt(info.requestedAt)}`,
        `Motivo: ${info.reason}`,
        "",
        "Aceda ao portal para aprovar ou rejeitar o pedido.",
      ].join("\n"),
      "Novo pedido de desbloqueio",
      true,
    );
  }
  if (info.email) {
    await deliver(
      [info.email],
      `Pedido de desbloqueio recebido - ${period}`,
      [
        `Olá ${info.fullName},`,
        "",
        `Recebemos o seu pedido de desbloqueio da pasta de ${period}.`,
        `Data/hora do pedido: ${formatDateTimePt(info.requestedAt)}`,
        `Motivo: ${info.reason}`,
        "",
        "Será notificado por email assim que o pedido for analisado. Se for aprovado depois do dia 10 do mês seguinte, terá 72 horas úteis para submeter a documentação.",
      ].join("\n"),
      "Pedido de desbloqueio recebido",
    );
  }
}

/**
 * Lembrete do dia 6 para clientes ativos que ainda não submeteram o mês anterior (Lisboa).
 * Com `period` ("AAAA-MM"), cada envio leva um Idempotency-Key do Resend por cliente e mês.
 */
export async function sendMonthlyReminders(period?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit" })
      .formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const currentYear = Number(parts["year"]);
  const currentMonth = Number(parts["month"]);
  const year = currentMonth === 1 ? currentYear - 1 : currentYear;
  const month = currentMonth === 1 ? 12 : currentMonth - 1;
  const { data: rows, error } = await supabaseAdmin
    .from("client_records")
    .select("id, user_id, email")
    .eq("folder_active", true)
    .not("user_id", "is", null);
  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;
  for (const r of (rows ?? []) as { id: string; user_id: string | null; email: string | null }[]) {
    const address = (r.email ?? "").trim();
    if (!r.user_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) continue;
    const { data: submissions, error: submissionError } = await supabaseAdmin
      .from("month_submissions")
      .select("id")
      .eq("user_id", r.user_id)
      .eq("year", year)
      .eq("month", month)
      .limit(1);
    if (submissionError) { failed++; continue; }
    if (submissions?.length) continue;
    const key = period ? `lembrete-${period}-${r.id}` : undefined;
    if (await deliver([address], REMINDER_SUBJECT, REMINDER_BODY, "Lembrete de prazo", false, key, true)) sent++;
    else failed++;
  }

  return { sent, failed };
}

/**
 * Submissão automática (corre dia 11, Lisboa, depois de terminar o prazo): meses
 * anteriores com documentos anexados mas não submetidos ficam registados com
 * o fim do prazo, dia 10 às 23:59:59 Lisboa, sem declaração prestada pelo cliente.
 */
export async function autoSubmitPendingMonths(now: Date = new Date()) {
  if (!isMonthlySubmissionTime(now)) return { skipped: true, submitted: 0 };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const lisYear = Number(parts['year']);
  const lisMonth = Number(parts['month']);
  const lisHour = Number(parts['hour']) % 24;
  const offsetH = (lisHour - now.getUTCHours() + 24) % 24;
  const month = lisMonth === 1 ? 12 : lisMonth - 1;
  const year = lisMonth === 1 ? lisYear - 1 : lisYear;
  const submittedAt = new Date(
    Date.UTC(lisYear, lisMonth - 1, 10, 23 - offsetH, 59, 59),
  ).toISOString();

  const { data: clients, error } = await supabaseAdmin
    .from("client_records")
    .select("user_id, name, nif, email, responsible_name")
    .eq("folder_active", true)
    .not("user_id", "is", null);
  if (error) throw new Error(error.message);

  let submitted = 0;
  for (const c of clients ?? []) {
    const userId = c.user_id as string;
    const { data: existing } = await supabaseAdmin
      .from("month_submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month)
      .limit(1);
    if (existing && existing.length > 0) continue;
    const { count } = await supabaseAdmin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month);
    if (!count) continue;

    const responsibleName = c.responsible_name || c.name;
    const declarationText = [
      "DECLARAÇÃO CONSIDERADA PRESTADA POR DECURSO DO PRAZO",
      `NIF DA EMPRESA: ${c.nif}`,
      `NOME DA EMPRESA: ${c.name}`,
      `PERÍODO: ${monthLabel(month)}/${year}`,
      "O cliente anexou documentação e não a submeteu até ao fim do prazo. Nos termos das Condições do portal, a documentação foi submetida automaticamente e considera-se prestada, por decurso do prazo, a declaração de conclusão da entrega. Esta declaração não foi escrita nem confirmada pelo cliente no momento da submissão.",
      `DATA E HORA DO FIM DO PRAZO: ${formatDateTimePt(submittedAt)}`,
    ].join("\n");
    const { error: insErr } = await supabaseAdmin.from("month_submissions").insert({
      user_id: userId,
      nif: c.nif,
      company_name: c.name,
      responsible_name: responsibleName,
      declaration_text: declarationText,
      year,
      month,
      declaration_accepted: false,
      document_count: count,
      submitted_at: submittedAt,
    });
    if (insErr) {
      console.error("[autoSubmit] falha", userId, insErr.message);
      continue;
    }
    const info = {
      fullName: c.name,
      nif: c.nif,
      ...(c.email ? { email: c.email } : {}),
      year,
      month,
      submittedAt,
      documentCount: count,
      declarationText,
      automatic: true,
    };
    try {
      await notifyAdminOfSubmission(info);
      await notifyClientOfSubmission(info);
    } catch (e) {
      console.error("[autoSubmit] emails", e);
    }
    submitted++;
  }
  return { year, month, submitted };
}

/**
 * Fim de reaberturas aprovadas (incl. 72 h úteis): se o prazo terminou e o
 * cliente não carregou em «Submeter», o mês é submetido automaticamente com a
 * data do fim do prazo, a reabertura fecha e cliente + administração recebem os emails.
 */
export async function autoSubmitExpiredUnlocks(now: Date = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: reqs, error } = await supabaseAdmin
    .from("unlock_requests")
    .select("id, user_id, year, month, decided_at")
    .eq("status", "aprovado");
  if (error) throw new Error(error.message);

  let submitted = 0;
  for (const r of reqs ?? []) {
    if (!r.decided_at) continue;
    const expiry = unlockExpiry(r.year, r.month, r.decided_at);
    if (expiry.getTime() > now.getTime()) continue;
    const submittedAt = expiry.toISOString();

    await supabaseAdmin.from("unlock_requests").update({ status: "fechado" }).eq("id", r.id);

    const { count } = await supabaseAdmin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.user_id)
      .eq("year", r.year)
      .eq("month", r.month);
    if (!count) continue;

    const { data: c } = await supabaseAdmin
      .from("client_records")
      .select("name, nif, email, responsible_name")
      .eq("user_id", r.user_id)
      .maybeSingle();
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("full_name, nif, email")
      .eq("id", r.user_id)
      .maybeSingle();
    const name = c?.name || p?.full_name || "";
    const nif = c?.nif || p?.nif || "";
    const email = c?.email || p?.email || "";
    const responsibleName = c?.responsible_name || name;
    const declarationText = [
      "DECLARAÇÃO CONSIDERADA PRESTADA POR DECURSO DO PRAZO",
      `NIF DA EMPRESA: ${nif}`,
      `NOME DA EMPRESA: ${name}`,
      `PERÍODO: ${monthLabel(r.month)}/${r.year}`,
      "O cliente anexou documentação e não a submeteu até ao fim do prazo de reabertura. Nos termos das Condições do portal, a documentação foi submetida automaticamente e considera-se prestada, por decurso do prazo, a declaração de conclusão da entrega. Esta declaração não foi escrita nem confirmada pelo cliente no momento da submissão.",
      `DATA E HORA DO FIM DO PRAZO: ${formatDateTimePt(submittedAt)}`,
    ].join("\n");
    const payload = {
      user_id: r.user_id,
      nif,
      company_name: name,
      responsible_name: responsibleName,
      declaration_text: declarationText,
      year: r.year,
      month: r.month,
      declaration_accepted: false,
      document_count: count,
      submitted_at: submittedAt,
    };
    const { data: existing } = await supabaseAdmin
      .from("month_submissions")
      .select("id")
      .eq("user_id", r.user_id)
      .eq("year", r.year)
      .eq("month", r.month)
      .limit(1);
    const { error: wErr } = existing?.[0]
      ? await supabaseAdmin.from("month_submissions").update(payload).eq("id", existing[0].id)
      : await supabaseAdmin.from("month_submissions").insert(payload);
    if (wErr) {
      console.error("[autoSubmitUnlock] falha", r.id, wErr.message);
      continue;
    }
    const info = {
      fullName: name,
      nif,
      ...(email ? { email } : {}),
      year: r.year,
      month: r.month,
      submittedAt,
      documentCount: count,
      declarationText,
      automatic: true,
    };
    try {
      await notifyAdminOfSubmission(info);
      await notifyClientOfSubmission(info);
    } catch (e) {
      console.error("[autoSubmitUnlock] emails", e);
    }
    submitted++;
  }
  return { submitted };
}
