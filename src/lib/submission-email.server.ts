import {
  monthLabel,
  formatDateTimePt,
  REMINDER_SUBJECT,
  REMINDER_BODY,
  unlockExpiry,
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
  const declIdx = lines.findIndex((l) => /^DECLARAÇÃO/.test(l.trim()));
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
      <a href="${esc((process.env["SITE_URL"] || "https://as-golden-guidance.lovable.app").replace(/\/$/, "") + "/" + (admin ? "admin" : "login"))}" style="background-color:#c9a227;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">${admin ? "Ver no Painel de Administração" : "Aceder ao Portal"}</a>
    </p>
    ${admin ? '<p style="color:#888;font-size:12px;font-style:italic;">Notificação automática do Portal AS Contabilidade</p>' : "<p>Com os melhores cumprimentos,<br><strong>Equipa AS Contabilidade</strong></p>"}
  </div>
</div>`;
}

async function deliver(to: string[], subject: string, body: string, title = subject, admin = false) {
  const original = Array.from(new Set(to.filter(Boolean)));
  if (original.length === 0) return;
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
      console.log(`[email] (sem RESEND_API_KEY) para ${address} :: ${finalSubject}\n${text}`);
      continue;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [address], subject: finalSubject, text, html }),
      });
      if (!res.ok) console.error(`[email] Resend falhou (${res.status}): ${await res.text()}`);
    } catch (e) {
      console.error("[email] erro ao enviar", e);
    }
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
    "Nova submissão de documentação",
    true,
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
    await deliver([address], REMINDER_SUBJECT, REMINDER_BODY, "Lembrete de prazo");
  }

  return { sent: recipients.length };
}

/**
 * Submissão automática (corre dia 10 às 09:00, Lisboa): meses anteriores com
 * documentos anexados mas não submetidos ficam submetidos com data do dia 9
 * às 23:59:59, e cliente + administração recebem os emails habituais.
 */
export async function autoSubmitPendingMonths(now: Date = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { buildSubmissionDeclaration } = await import("@/lib/portal");
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
  const lisYear = Number(parts.year);
  const lisMonth = Number(parts.month);
  const lisHour = Number(parts.hour) % 24;
  const offsetH = (lisHour - now.getUTCHours() + 24) % 24;
  const month = lisMonth === 1 ? 12 : lisMonth - 1;
  const year = lisMonth === 1 ? lisYear - 1 : lisYear;
  const submittedAt = new Date(
    Date.UTC(lisYear, lisMonth - 1, 9, 23 - offsetH, 59, 59),
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
    const declarationText = buildSubmissionDeclaration({
      nif: c.nif,
      companyName: c.name,
      responsibleName,
      year,
      month,
      at: submittedAt,
    }) + "\n\n(Submissão automática no fim do prazo)";
    const { error: insErr } = await supabaseAdmin.from("month_submissions").insert({
      user_id: userId,
      nif: c.nif,
      company_name: c.name,
      responsible_name: responsibleName,
      declaration_text: declarationText,
      year,
      month,
      declaration_accepted: true,
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
