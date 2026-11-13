import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isMonthPastDeadline,
  documentNumber,
  unlockIsActive,
  buildUnlockDeclaration,
  buildSubmissionDeclaration,
  RULES_VERSION,
  buildRulesText,
} from "@/lib/portal";

const categoryEnum = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9_]+$/, "Categoria inválida.");


async function isAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return data === true;
}

/** Dados da ficha do cliente usados no preenchimento automático das declarações. */
async function clientIdentity(context: { supabase: any }, userId: string) {
  const { data: record } = await context.supabase
    .from("client_records")
    .select("name, nif, email, responsible_name, folder_active, client_number")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: profile } = await context.supabase
    .from("profiles")
    .select("full_name, nif, email")
    .eq("id", userId)
    .maybeSingle();

  return {
    companyName: record?.name || profile?.full_name || "",
    nif: record?.nif || profile?.nif || "",
    email: record?.email || profile?.email || "",
    responsibleName: record?.responsible_name || "",
    clientNumber: record?.client_number || "",
    folderActive: record ? Boolean(record.folder_active) : true,
  };
}

async function monthIsSubmitted(
  context: { supabase: any },
  userId: string,
  year: number,
  month: number,
) {
  const { data } = await context.supabase
    .from("month_submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return Boolean(data);
}

/** Razão concreta para um mês não aceitar documentos (para o cliente perceber o que fazer). */
async function closedMonthReason(
  context: { supabase: any },
  userId: string,
  year: number,
  month: number,
  action: "enviar" | "remover",
) {
  const { data: record } = await context.supabase
    .from("client_records")
    .select("folder_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (!record || record.folder_active !== true) {
    return "A sua pasta ainda não está ativa. Contacte o gabinete.";
  }
  if (await monthIsSubmitted(context, userId, year, month)) {
    return action === "enviar"
      ? "Este mês já foi submetido. Para enviar mais documentos, peça a reabertura do mês."
      : "Este mês já foi submetido. Não é possível remover documentos.";
  }
  return action === "enviar"
    ? "Esta pasta está bloqueada. Peça o desbloqueio do mês."
    : "Esta pasta está bloqueada. Não é possível remover documentos.";
}

async function monthIsWritable(
  context: { supabase: any },
  userId: string,
  year: number,
  month: number,
) {
  // A base de dados é quem decide (é a mesma regra que protege a tabela de
  // documentos). Só se a função não responder é que se usa a regra local.
  const { data: open, error: openError } = await context.supabase.rpc("month_is_open", {
    p_user_id: userId,
    p_year: year,
    p_month: month,
  });
  if (!openError && typeof open === "boolean") return open;
  if (openError) console.error("[monthIsWritable] month_is_open falhou:", openError.message);

  const pastDeadline = isMonthPastDeadline(year, month);
  const submitted = await monthIsSubmitted(context, userId, year, month);
  if (!pastDeadline && !submitted) return true;

  const { data } = await context.supabase
    .from("unlock_requests")
    .select("id, decided_at")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .eq("status", "aprovado");
  return (data ?? []).some((r: { decided_at: string | null }) =>
    unlockIsActive(year, month, r.decided_at),
  );
}

export const getSessionInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, full_name, nif, email")
      .eq("id", context.userId)
      .maybeSingle();

    const admin = await isAdmin(context);

    // Ficha completa do próprio cliente (RLS permite SELECT da ficha própria).
    const { data: record } = admin
      ? { data: null }
      : await context.supabase
          .from("client_records")
          .select(
            "client_number, name, nif, email, phone, responsible_name, address, postal_code, locality, folder_active",
          )
          .eq("user_id", context.userId)
          .maybeSingle();

    return {
      userId: context.userId,
      email: (context.claims as { email?: string }).email ?? profile?.email ?? "",
      profile: profile ?? null,
      isAdmin: admin,
      record: record ?? null,
    };
  });

const listSchema = z.object({
  clientId: z.string().uuid().optional(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  category: categoryEnum,
});

export const listDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const target = admin && data.clientId ? data.clientId : context.userId;

    const { data: rows, error } = await context.supabase
      .from("documents")
      .select(
        "id, label, original_name, storage_path, size_bytes, created_at, supplier, doc_date, late, late_submitted_at",
      )
      .eq("user_id", target)
      .eq("year", data.year)
      .eq("month", data.month)
      .eq("category", data.category)
      .order("seq", { ascending: true });

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const countsForYear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clientId: z.string().uuid().optional(), year: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const target = admin && data.clientId ? data.clientId : context.userId;
    const { data: rows, error } = await context.supabase
      .from("documents")
      .select("month, category")
      .eq("user_id", target)
      .eq("year", data.year);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) {
      counts[`${r.month}`] = (counts[`${r.month}`] ?? 0) + 1;
      counts[`${r.month}:${r.category}`] = (counts[`${r.month}:${r.category}`] ?? 0) + 1;
    }
    return counts;
  });

export const reserveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    listSchema
      .extend({
        originalName: z.string().min(1).max(200),
        supplier: z.string().trim().max(80).optional(),
        docDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const target = admin && data.clientId ? data.clientId : context.userId;

    if (!admin && !(await monthIsWritable(context, target, data.year, data.month))) {
      throw new Error(await closedMonthReason(context, target, data.year, data.month, "enviar"));
    }

    if (!data.originalName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Apenas são aceites ficheiros PDF.");
    }

    const { data: cat } = await context.supabase
      .from("document_categories")
      .select("slug")
      .eq("slug", data.category)
      .maybeSingle();
    if (!cat) throw new Error("Esta categoria já não existe.");
    const allowedCats = await allowedCategoriesFor(context, target);
    if (allowedCats && !allowedCats.includes(data.category)) {
      throw new Error("Esta categoria não está disponível para este cliente.");
    }

    // Só é "fora de prazo" depois do dia 10 do mês seguinte; uma reabertura
    // aprovada dentro do prazo não torna o documento atrasado.
    const lateEntry = isMonthPastDeadline(data.year, data.month);
    const lateAt = lateEntry ? new Date().toISOString() : null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const { count, error: countError } = await context.supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", target)
        .eq("year", data.year)
        .eq("month", data.month)
        .eq("category", data.category);
      if (countError) throw new Error(countError.message);

      const seq = (count ?? 0) + 1 + attempt;
      const prefixes: Record<string, string> = {
        documentos_salarios: "SAL",
        faturas_despesas: "DESP",
        faturas_vendas: "VEND",
        faturas_compras: "COMP",
        mapas_caixa: "CAIXA",
        extratos_bancarios: "EXT",
        outros_documentos: "OUT",
      };
      const prefix =
        prefixes[data.category] ??
        (data.category.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "DOC");
      const label = `${prefix}-${String(data.month).padStart(2, "0")}-${String(seq).padStart(2, "0")}`;
      const storagePath = `${target}/${data.year}/${String(data.month).padStart(2, "0")}/${data.category}/${label}.pdf`;

      const { data: inserted, error } = await context.supabase
        .from("documents")
        .insert({
          user_id: target,
          year: data.year,
          month: data.month,
          category: data.category,
          seq,
          label,
          original_name: data.originalName,
          storage_path: storagePath,
          supplier: data.supplier?.trim() ?? "",
          doc_date: data.docDate ?? null,
          late: lateEntry,
          late_submitted_at: lateAt,
        })
        .select("id, label, storage_path, supplier, doc_date, late, late_submitted_at")
        .single();

      if (!error && inserted) return inserted;
      if (error && /row-level security|permission denied/i.test(error.message)) {
        throw new Error(await closedMonthReason(context, target, data.year, data.month, "enviar"));
      }
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    }

    throw new Error("Não foi possível atribuir um número ao documento. Tente novamente.");
  });

export const confirmDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), sizeBytes: z.number().int().nonnegative() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      .update({ size_bytes: data.sizeBytes })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, storage_path, user_id, year, month")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Documento não encontrado.");

    if (
      !(await isAdmin(context)) &&
      !(await monthIsWritable(context, doc.user_id, doc.year, doc.month))
    ) {
      throw new Error(await closedMonthReason(context, doc.user_id, doc.year, doc.month, "remover"));
    }

    await context.supabase.storage.from("documentos").remove([doc.storage_path]);
    const { error: delError } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (delError) throw new Error(delError.message);
    return { ok: true };
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("storage_path, label")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Documento não encontrado.");

    // O ficheiro descarregado chama-se sempre só o número (ex.: "11-01.pdf").
    const fileName = documentNumber(doc.label).replace(/[\\/:*?"<>|]+/g, "-").trim() || "documento";
    const { data: signed, error: signError } = await context.supabase.storage
      .from("documentos")
      .createSignedUrl(doc.storage_path, 60, { download: `${fileName}.pdf` });
    if (signError || !signed) throw new Error(signError?.message ?? "Erro ao gerar ligação.");
    return { url: signed.signedUrl };
  });

async function adminIdSet(context: any): Promise<Set<string>> {
  const { data } = await context.supabase.from("user_roles").select("user_id").eq("role", "admin");
  return new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id));
}

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, nif, email, created_at")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    const admins = await adminIdSet(context);
    return (data ?? []).filter((p) => !admins.has(p.id));
  });

export const getClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: row, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, nif, email")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Cliente não encontrado.");
    return row;
  });

/** Segundo email ao cliente novo, com as regras de entrega. Nunca faz falhar a criação. */
async function sendRulesEmailSafe(email: string, fullName: string) {
  try {
    const { sendClientRulesEmail } = await import("@/lib/submission-email.server");
    await sendClientRulesEmail({ email, fullName });
  } catch (e) {
    console.error("[regras] não foi possível enviar o email de regras", e);
  }
}

/** Indica se o cliente já aceitou a versão atual das regras. Administradores não precisam. */
export const getRulesStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (await isAdmin(context)) return { required: false, accepted: true };
    const { data, error } = await context.supabase
      .from("rules_acceptances")
      .select("id")
      .eq("user_id", context.userId)
      .eq("version", RULES_VERSION)
      .limit(1);
    // Se a tabela ainda não existir, não bloqueia o cliente.
    if (error) {
      console.error("[regras] não foi possível ler a aceitação", error.message);
      return { required: false, accepted: true };
    }
    return { required: true, accepted: (data ?? []).length > 0 };
  });

/** Regista a aceitação das regras pelo cliente autenticado. */
export const acceptRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("rules_acceptances").insert({
      user_id: context.userId,
      version: RULES_VERSION,
      rules_text: buildRulesText(),
    });
    if (error && error.code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        fullName: z.string().min(2).max(120),
        nif: z.string().min(9).max(20),
        email: z.string().email(),
        redirectTo: z.string().url(),
        categories: z.array(categoryEnum).min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { redirectTo: data.redirectTo },
    );
    if (inviteError || !invited?.user) {
      throw new Error(inviteError?.message ?? "Não foi possível convidar este cliente.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: invited.user.id,
      full_name: data.fullName,
      nif: data.nif,
      email: data.email,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: invited.user.id, role: "cliente" });
    if (roleError) throw new Error(roleError.message);

    const { error: recError } = await supabaseAdmin.from("client_records").insert({
      user_id: invited.user.id,
      name: data.fullName,
      nif: data.nif,
      email: data.email,
      folder_active: true,
      allowed_categories: data.categories,
    });
    if (recError) throw new Error(recError.message);

    await sendRulesEmailSafe(data.email, data.fullName);

    return { id: invited.user.id };
  });

/* ------------------------- Pedidos de desbloqueio ------------------------- */

export const listUnlockRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clientId: z.string().uuid().optional(), year: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const target = admin && data.clientId ? data.clientId : context.userId;
    const { data: rows, error } = await context.supabase
      .from("unlock_requests")
      .select("id, year, month, reason, status, admin_note, created_at, decided_at")
      .eq("user_id", target)
      .eq("year", data.year)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPendingUnlockRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: rows, error } = await context.supabase
      .from("unlock_requests")
      .select("id, user_id, nif, year, month, reason, status, created_at, decided_at")
      .in("status", ["pendente", "aprovado"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)));
    let names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      names = Object.fromEntries(
        (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
      );
    }
    return (rows ?? []).map((r: { user_id: string }) => ({
      ...r,
      full_name: names[r.user_id] ?? "Cliente",
    }));
  });

export const listAdminUnlockRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: rows, error } = await context.supabase
      .from("unlock_requests")
      .select("id, user_id, nif, year, month, reason, status, created_at, decided_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)));
    let names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      names = Object.fromEntries(
        (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
      );
    }
    return (rows ?? []).map((r: { user_id: string }) => ({
      ...r,
      full_name: names[r.user_id] ?? "Cliente",
    }));
  });

export const createUnlockRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        reason: z.string().min(5).max(2000),
        responsibleName: z.string().trim().max(120).optional(),
        declarationAccepted: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const identity = await clientIdentity(context, context.userId);
    const at = new Date().toISOString();
    const responsibleName = data.responsibleName?.trim() || identity.responsibleName;

    const { data: row, error } = await context.supabase
      .from("unlock_requests")
      .insert({
        user_id: context.userId,
        nif: identity.nif,
        company_name: identity.companyName,
        responsible_name: responsibleName,
        declaration_text: buildUnlockDeclaration({
          nif: identity.nif,
          companyName: identity.companyName,
          responsibleName,
          year: data.year,
          month: data.month,
          at,
        }),
        year: data.year,
        month: data.month,
        reason: data.reason,
        declaration_accepted: true,
        status: "pendente",
      })
      .select("id")
      .single();
    if (error) {
      if (error.message.includes("duplicate")) {
        throw new Error("Já existe um pedido ativo para esta pasta.");
      }
      throw new Error(error.message);
    }
    try {
      const { notifyUnlockRequested } = await import("@/lib/submission-email.server");
      await notifyUnlockRequested({
        fullName: identity.companyName || "Cliente",
        nif: identity.nif,
        ...(identity.email ? { email: identity.email } : {}),
        year: data.year,
        month: data.month,
        reason: data.reason,
        requestedAt: at,
      });
    } catch (e) {
      console.error("[createUnlockRequest] falha ao enviar notificações:", e);
    }

    return row;
  });

export const decideUnlockRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["aprovado", "rejeitado", "fechado"]),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const decidedAt = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("unlock_requests")
      .update({
        status: data.decision,
        admin_note: data.note ?? null,
        decided_by: context.userId,
        decided_at: decidedAt,
      })
      .eq("id", data.id)
      .select("user_id, nif, year, month, reason, declaration_text, company_name, responsible_name")
      .single();
    if (error) throw new Error(error.message);

    try {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("full_name, email, nif")
        .eq("id", row.user_id)
        .maybeSingle();
      const { notifyUnlockDecision } = await import("@/lib/submission-email.server");
      await notifyUnlockDecision({
        fullName: row.company_name || profile?.full_name || "Cliente",
        nif: profile?.nif ?? row.nif ?? "",
        ...(profile?.email ? { email: profile.email as string } : {}),
        year: row.year,
        month: row.month,
        reason: row.reason,
        decision: data.decision,
        decidedAt,
        ...(data.note && data.note.trim() ? { adminNote: String(data.note).trim() } : {}),
        declarationText: row.declaration_text ?? "",
      });
    } catch (e) {
      console.error("[decideUnlockRequest] falha ao enviar comprovativo:", e);
    }

    return { ok: true };
  });

/** Admin bloqueia ou desbloqueia diretamente o mês de um cliente. */
export const adminSetMonthLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clientId: z.string().uuid(),
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        action: z.enum(["lock", "unlock"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, nif")
      .eq("id", data.clientId)
      .maybeSingle();
    const reason =
      data.action === "unlock" ? "Desbloqueio pela administração" : "Bloqueio pela administração";

    // Fecha qualquer desbloqueio ativo/pendente anterior.
    await supabaseAdmin
      .from("unlock_requests")
      .update({ status: "fechado", decided_by: context.userId, decided_at: now })
      .eq("user_id", data.clientId)
      .eq("year", data.year)
      .eq("month", data.month)
      .in("status", ["aprovado", "pendente"]);

    if (data.action === "unlock") {
      const { error } = await supabaseAdmin.from("unlock_requests").insert({
        user_id: data.clientId,
        nif: profile?.nif ?? "",
        year: data.year,
        month: data.month,
        reason,
        declaration_accepted: true,
        status: "aprovado",
        decided_by: context.userId,
        decided_at: now,
        company_name: profile?.full_name ?? "",
        declaration_text: reason,
      });
      if (error) throw new Error(error.message);
    } else if (
      !(
        data.year > new Date().getFullYear() ||
        (data.year === new Date().getFullYear() && data.month > new Date().getMonth() + 1)
      )
    ) {
      // Meses futuros voltam a ficar bloqueados só por fechar o desbloqueio.
      const { data: sub } = await supabaseAdmin
        .from("month_submissions")
        .select("id")
        .eq("user_id", data.clientId)
        .eq("year", data.year)
        .eq("month", data.month)
        .maybeSingle();
      if (!sub) {
        const { count } = await supabaseAdmin
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", data.clientId)
          .eq("year", data.year)
          .eq("month", data.month);
        const { error } = await supabaseAdmin.from("month_submissions").insert({
          user_id: data.clientId,
          nif: profile?.nif ?? "",
          year: data.year,
          month: data.month,
          declaration_accepted: true,
          document_count: count ?? 0,
          submitted_at: now,
          company_name: profile?.full_name ?? "",
          declaration_text: reason,
        });
        if (error) throw new Error(error.message);
      }
    }

    try {
      const { notifyUnlockDecision } = await import("@/lib/submission-email.server");
      await notifyUnlockDecision({
        fullName: profile?.full_name || "Cliente",
        nif: profile?.nif ?? "",
        ...(profile?.email ? { email: profile.email as string } : {}),
        year: data.year,
        month: data.month,
        reason,
        decision: data.action === "unlock" ? "aprovado" : "fechado",
        decidedAt: now,
        declarationText: "Ação realizada diretamente pela administração.",
      });
    } catch (e) {
      console.error("[adminSetMonthLock] falha ao enviar email:", e);
    }
    return { ok: true };
  });

/* ------------------------- Submissão final do mês ------------------------- */

export const listMonthSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ clientId: z.string().uuid().optional(), year: z.number().int() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const target = admin && data.clientId ? data.clientId : context.userId;
    const { data: rows, error } = await context.supabase
      .from("month_submissions")
      .select("id, year, month, submitted_at, document_count")
      .eq("user_id", target)
      .eq("year", data.year)
      .order("month", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const submitMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
        responsibleName: z.string().trim().max(120).optional(),
        declarationAccepted: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // (7) Falhas devolvem 401/403 com mensagens genéricas; detalhes só no log do servidor.
    const { setResponseStatus } = await import("@tanstack/react-start/server");
    const deny = (status: 401 | 403, message: string, detail?: unknown): never => {
      if (detail) console.error("[submitMonth]", detail);
      setResponseStatus(status);
      throw new Error(message);
    };
    const GENERIC = "Não foi possível submeter a documentação.";

    // (1) Identidade vem exclusivamente da sessão validada pelo middleware.
    const userId = context.userId;
    if (!userId) deny(401, "A sua sessão expirou. Entre novamente.");

    // (2) Ficha tem de existir e a pasta tem de estar ativa.
    const { data: record, error: recErr } = await context.supabase
      .from("client_records")
      .select("name, nif, email, responsible_name, folder_active")
      .eq("user_id", userId)
      .maybeSingle();
    if (recErr) deny(403, GENERIC, recErr);
    if (!record || record.folder_active !== true) {
      deny(403, "A pasta do cliente não se encontra ativa.");
    }

    // (3)+(4) A decisão de abertura pertence exclusivamente à base de dados:
    // month_is_open devolve true para mês aberto ou com desbloqueio aprovado posterior à submissão.
    const { data: open, error: openErr } = await context.supabase.rpc("month_is_open" as never, {
      p_user_id: userId,
      p_year: data.year,
      p_month: data.month,
    } as never);
    if (openErr) deny(403, GENERIC, openErr);
    if (open !== true) {
      deny(403, "O período selecionado encontra-se encerrado para submissão.");
    }

    // (6) Contagem e identidade calculadas no servidor; valores do pedido ignorados.
    const { count, error: countError } = await context.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("year", data.year)
      .eq("month", data.month);
    if (countError) deny(403, GENERIC, countError);
    if (!count) {
      deny(403, "Anexe pelo menos um documento antes de submeter o mês.");
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, nif, email")
      .eq("id", userId)
      .maybeSingle();
    const identity = {
      companyName: record!.name || profile?.full_name || "",
      nif: record!.nif || profile?.nif || "",
      email: record!.email || profile?.email || "",
    };
    const responsibleName = record!.responsible_name || profile?.full_name || identity.companyName;
    const at = new Date().toISOString();
    const declarationText = buildSubmissionDeclaration({
      nif: identity.nif,
      companyName: identity.companyName,
      responsibleName,
      year: data.year,
      month: data.month,
      at,
    });

    // (5) declaration_accepted só chega aqui se o pedido trouxer exatamente true (z.literal).
    const payload = {
      user_id: userId,
      nif: identity.nif,
      company_name: identity.companyName,
      responsible_name: responsibleName,
      declaration_text: declarationText,
      year: data.year,
      month: data.month,
      declaration_accepted: true,
      document_count: count as number,
    };

    // Escrita só com o cliente de serviço, depois de todas as verificações; clientes não têm INSERT.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cols = "id, year, month, submitted_at, document_count";
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("month_submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("year", data.year)
      .eq("month", data.month)
      .maybeSingle();
    if (exErr) deny(403, GENERIC, exErr);
    let row: { id: string; year: number; month: number; submitted_at: string; document_count: number };
    if (existing) {
      const { data: upd, error } = await supabaseAdmin
        .from("month_submissions")
        .update({ ...payload, submitted_at: at })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select(cols)
        .single();
      if (error || !upd) deny(403, GENERIC, error);
      row = upd!;
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("month_submissions")
        .insert({ ...payload, submitted_at: at })
        .select(cols)
        .single();
      if (error || !ins) deny(403, GENERIC, error);
      row = ins!;
    }

    // A reabertura termina com a nova submissão: a pasta volta a bloquear.
    {
      await supabaseAdmin
        .from("unlock_requests")
        .update({ status: "fechado" })
        .eq("user_id", userId)
        .eq("year", data.year)
        .eq("month", data.month)
        .eq("status", "aprovado");
    }

    try {
      const { notifyAdminOfSubmission, notifyClientOfSubmission } = await import(
        "@/lib/submission-email.server"
      );
      const info = {
        fullName: identity.companyName,
        nif: identity.nif,
        ...(identity.email ? { email: identity.email } : {}),
        year: data.year,
        month: data.month,
        submittedAt: row.submitted_at as string,
        documentCount: count as number,
        declarationText,
      };
      await notifyAdminOfSubmission(info);
      await notifyClientOfSubmission(info);
    } catch (e) {
      console.error("[submitMonth] falha ao enviar as notificações:", e);
    }

    return row;
  });

export const listRecentSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: rows, error } = await context.supabase
      .from("month_submissions")
      .select("id, user_id, nif, year, month, submitted_at, document_count")
      .order("submitted_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)));
    let names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      names = Object.fromEntries(
        (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
      );
    }
    return (rows ?? []).map((r: { user_id: string }) => ({
      ...r,
      full_name: names[r.user_id] ?? "Cliente",
    }));
  });

/* ---------------------- Categorias de documentos ---------------------- */

function slugify(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

async function allowedCategoriesFor(context: { supabase: any }, userId: string) {
  const { data } = await context.supabase
    .from("client_records")
    .select("allowed_categories")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.allowed_categories as string[] | null | undefined) ?? null;
}

const OFFICIAL_CATEGORIES = [
  { slug: "documentos_salarios", label: "Documentos de Salários", position: 1 },
  { slug: "faturas_despesas", label: "Faturas de Despesas", position: 2 },
  { slug: "faturas_vendas", label: "Faturas de Vendas", position: 3 },
  { slug: "faturas_compras", label: "Faturas de Compras de Mercadoria", position: 4 },
  { slug: "mapas_caixa", label: "Mapas de Caixa", position: 5 },
  { slug: "extratos_bancarios", label: "Extratos Bancários", position: 6 },
  { slug: "outros_documentos", label: "Outros Documentos", position: 7 },
];
let categoriesEnsured = false;

/** Garante que as 7 categorias oficiais existem (nome e ordem) na base de dados ligada. */
async function ensureOfficialCategories() {
  if (categoriesEnsured) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("document_categories")
      .select("slug");
    const have = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
    for (const c of OFFICIAL_CATEGORIES) {
      if (have.has(c.slug)) {
        await supabaseAdmin
          .from("document_categories")
          .update({ label: c.label, position: c.position })
          .eq("slug", c.slug);
      } else {
        await supabaseAdmin.from("document_categories").insert(c);
      }
    }
    categoriesEnsured = true;
  } catch (e) {
    console.error("ensureOfficialCategories", e);
  }
}

export const listCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ clientId: z.string().uuid().optional(), all: z.boolean().optional() })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureOfficialCategories();
    const { data: rows, error } = await context.supabase
      .from("document_categories")
      .select("id, slug, label, position")
      .order("position", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const admin = await isAdmin(context);
    if (admin && data?.all) return list;
    const target = admin && data?.clientId ? data.clientId : admin ? null : context.userId;
    if (!target) return list;
    const allowed = await allowedCategoriesFor(context, target);
    return allowed ? list.filter((c: { slug: string }) => allowed.includes(c.slug)) : list;
  });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ label: z.string().trim().min(2).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const slug = slugify(data.label);
    if (!slug) throw new Error("Indique um nome válido para a categoria.");

    const { count } = await context.supabase
      .from("document_categories")
      .select("id", { count: "exact", head: true });

    const { data: row, error } = await context.supabase
      .from("document_categories")
      .insert({ slug, label: data.label.trim(), position: (count ?? 0) + 1 })
      .select("id, slug, label, position")
      .single();
    if (error) {
      if (error.message.includes("duplicate")) throw new Error("Já existe uma categoria com este nome.");
      throw new Error(error.message);
    }
    return row;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), label: z.string().trim().min(2).max(60) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { error } = await context.supabase
      .from("document_categories")
      .update({ label: data.label.trim() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");

    const { data: cat, error: catError } = await context.supabase
      .from("document_categories")
      .select("slug")
      .eq("id", data.id)
      .maybeSingle();
    if (catError) throw new Error(catError.message);
    if (!cat) throw new Error("Categoria não encontrada.");

    const { count, error: countError } = await context.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("category", cat.slug);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        `Não é possível remover: existem ${count} documento(s) nesta categoria. O histórico é preservado.`,
      );
    }

    const { error } = await context.supabase
      .from("document_categories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------- Fichas de cliente ------------------------- */

export const getMyClientIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const identity = await clientIdentity(context, context.userId);
    return { ...identity, isAdmin: await isAdmin(context) };
  });

const recordSchema = z.object({
  clientNumber: z.string().trim().max(30).default(""),
  name: z.string().trim().min(2).max(160),
  nif: z.string().trim().max(20).default(""),
  address: z.string().trim().max(200).default(""),
  postalCode: z.string().trim().max(20).default(""),
  locality: z.string().trim().max(120).default(""),
  email: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(40).default(""),
  responsibleName: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(4000).default(""),
  folderActive: z.boolean().default(false),
  categories: z.array(z.string().trim().min(1).max(60)).max(50).nullable().optional(),
  atSubuser: z.boolean().nullable().optional(),
  ssSubuser: z.boolean().nullable().optional(),
});

function recordColumns(v: z.infer<typeof recordSchema>) {
  return {
    client_number: v.clientNumber,
    name: v.name,
    nif: v.nif,
    address: v.address,
    postal_code: v.postalCode,
    locality: v.locality,
    email: v.email,
    phone: v.phone,
    responsible_name: v.responsibleName,
    notes: v.notes,
    folder_active: v.folderActive,
    ...(v.categories !== undefined ? { allowed_categories: v.categories } : {}),
    ...(v.atSubuser !== undefined ? { at_subuser: v.atSubuser } : {}),
    ...(v.ssSubuser !== undefined ? { ss_subuser: v.ssSubuser } : {}),
  };
}

export const listClientRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data, error } = await context.supabase
      .from("client_records")
      .select("id, user_id, client_number, name, nif, email, phone, locality, folder_active")
      .order("name", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    const admins = await adminIdSet(context);
    return (data ?? []).filter((r) => !r.user_id || !admins.has(r.user_id));
  });

export const getClientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: row, error } = await context.supabase
      .from("client_records")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Ficha de cliente não encontrada.");
    return row;
  });

export const createClientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    recordSchema.extend({ redirectTo: z.string().url().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { redirectTo, ...rest } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const values: Record<string, unknown> = { ...recordColumns(rest) };
    let row: { id: string } | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await supabaseAdmin
        .from("client_records")
        .insert(values as never)
        .select("id")
        .single();
      if (!res.error) {
        row = res.data as { id: string };
        break;
      }
      const msg = `${res.error.message ?? ""} ${res.error.details ?? ""}`;
      console.error("createClientRecord", res.error);
      const missing =
        msg.match(/Could not find the '([a-z_]+)' column/i)?.[1] ??
        msg.match(/column "?([a-z_]+)"? of relation/i)?.[1] ??
        msg.match(/column "?([a-z_]+)"? does not exist/i)?.[1];
      if (missing && missing in values) {
        delete values[missing];
        continue;
      }
      if (/invalid input value for enum|malformed array/i.test(msg) && "allowed_categories" in values) {
        delete values["allowed_categories"];
        continue;
      }
      if (/duplicate key|unique/i.test(msg)) {
        throw new Error("Já existe um cliente com estes dados (por exemplo, o mesmo NIF, email ou número interno).");
      }
      if (/value too long/i.test(msg)) throw new Error("Um dos campos tem texto demasiado longo.");
      if (/invalid input syntax/i.test(msg)) throw new Error("Um dos campos tem um formato inválido.");
      throw new Error("Não foi possível criar o cliente. Verifique os dados e tente novamente.");
    }
    if (!row) throw new Error("Não foi possível criar o cliente. Verifique os dados e tente novamente.");
    let invited = false;
    let inviteError: string | null = null;
    if (rest.folderActive && redirectTo) {
      try {
        invited = (await sendAccessInvite(row.id, redirectTo)).invited;
      } catch (e) {
        inviteError = e instanceof Error ? e.message : "Falha ao enviar o convite.";
      }
    }
    return { id: row.id as string, invited, inviteError };
  });

export const updateClientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    recordSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const values: Record<string, unknown> = { ...recordColumns(rest) };
    let row: { user_id: string | null } | null = null;
    // Algumas bases de dados ligadas podem não ter todas as colunas (ex.: allowed_categories).
    // Nesse caso retira-se a coluna em falta e tenta-se de novo, para não bloquear a gravação.
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await supabaseAdmin
        .from("client_records")
        .update(values as never)
        .eq("id", id)
        .select("user_id")
        .maybeSingle();
      if (!res.error) {
        row = (res.data as { user_id: string | null } | null) ?? null;
        if (!row) throw new Error("Ficha de cliente não encontrada.");
        break;
      }
      const msg = `${res.error.message ?? ""} ${res.error.details ?? ""}`;
      console.error("updateClientRecord", res.error);
      const missing =
        msg.match(/Could not find the '([a-z_]+)' column/i)?.[1] ??
        msg.match(/column "?([a-z_]+)"? of relation/i)?.[1] ??
        msg.match(/column "?([a-z_]+)"? does not exist/i)?.[1];
      if (missing === "at_subuser" || missing === "ss_subuser") {
        throw new Error(
          "A base de dados ainda não tem os campos de validação (AT/Segurança Social). É preciso atualizá-la para guardar estas respostas.",
        );
      }
      if (missing && missing in values) {
        delete values[missing];
        continue;
      }
      if (/invalid input value for enum|malformed array/i.test(msg) && "allowed_categories" in values) {
        delete values["allowed_categories"];
        continue;
      }
      if (/duplicate key|unique/i.test(msg)) {
        throw new Error("Já existe outro cliente com estes dados (por exemplo, o mesmo NIF ou número interno).");
      }
      if (/row-level security|permission denied/i.test(msg)) {
        throw new Error("Não tem permissão para alterar esta ficha.");
      }
      if (/value too long/i.test(msg)) {
        throw new Error("Um dos campos tem texto demasiado longo.");
      }
      if (/invalid input syntax|malformed array/i.test(msg)) {
        throw new Error("Um dos campos tem um formato inválido.");
      }
      throw new Error("Não foi possível guardar a ficha. Verifique os dados e tente novamente.");
    }
    if (!row) throw new Error("Não foi possível guardar a ficha. Verifique os dados e tente novamente.");
    const uid = (row.user_id as string | null) ?? null;
    if (uid) {
      const { error: pe } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: rest.name, nif: rest.nif, ...(rest.email ? { email: rest.email } : {}) })
        .eq("id", uid);
      if (pe) console.error("updateClientRecord profile sync", pe);
    }
    return { ok: true };
  });

/** Indica quantos documentos/submissões o cliente tem, antes de apagar. */
export const getClientDeleteInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: rec } = await context.supabase
      .from("client_records")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    const uid = (rec?.user_id as string | null) ?? null;
    if (!uid) return { documents: 0, submissions: 0 };
    const [d, s] = await Promise.all([
      context.supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", uid),
      context.supabase.from("month_submissions").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    return { documents: d.count ?? 0, submissions: s.count ?? 0 };
  });

export const deleteClientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), force: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rec } = await supabaseAdmin
      .from("client_records")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    const uid = (rec?.user_id as string | null) ?? null;
    if (uid) {
      const { data: docs } = await supabaseAdmin
        .from("documents")
        .select("storage_path")
        .eq("user_id", uid);
      const { count: subs } = await supabaseAdmin
        .from("month_submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      if (((docs?.length ?? 0) > 0 || (subs ?? 0) > 0) && !data.force) {
        throw new Error("Este cliente tem documentos submetidos. Confirme a eliminação total.");
      }
      const paths = (docs ?? []).map((x) => x.storage_path).filter(Boolean);
      for (let i = 0; i < paths.length; i += 100) {
        await supabaseAdmin.storage.from("documentos").remove(paths.slice(i, i + 100));
      }
      await supabaseAdmin.from("documents").delete().eq("user_id", uid);
      await supabaseAdmin.from("month_submissions").delete().eq("user_id", uid);
      await supabaseAdmin.from("unlock_requests").delete().eq("user_id", uid);
    }
    const { error } = await supabaseAdmin.from("client_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (uid) await supabaseAdmin.auth.admin.deleteUser(uid);
    return { ok: true };
  });

export const importClientRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(recordSchema).min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    // Clientes importados entram sempre inativos; a ativação (e o email) é manual.
    const { error } = await context.supabase
      .from("client_records")
      .insert(data.rows.map((r) => ({ ...recordColumns(r), folder_active: false })));
    if (error) throw new Error(error.message);
    return { imported: data.rows.length };
  });

export const exportClientRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data, error } = await context.supabase
      .from("client_records")
      .select(
        "client_number, name, nif, responsible_name, address, postal_code, locality, phone, email, notes, folder_active",
      )
      .order("name", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setFolderActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { error } = await context.supabase
      .from("client_records")
      .update({ folder_active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cria uma ficha a partir de uma conta de acesso já existente sem ficha. */
export const createRecordFromAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: p, error: pe } = await context.supabase
      .from("profiles")
      .select("full_name, nif, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (pe || !p) throw new Error("Conta não encontrada.");
    const { data: row, error } = await context.supabase
      .from("client_records")
      .insert({
        user_id: data.userId,
        name: p.full_name,
        nif: p.nif,
        email: p.email,
        folder_active: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Intervalo mínimo (em segundos) entre emails de autenticação para o mesmo utilizador. */
const INVITE_COOLDOWN_SECONDS = 60;

function isRateLimitError(
  e: { status?: number | undefined; code?: string | undefined; message?: string | undefined } | null | undefined,
) {
  if (!e) return false;
  return (
    e.status === 429 ||
    e.code === "over_email_send_rate_limit" ||
    /rate limit|only request this after|too many/i.test(e.message ?? "")
  );
}

/**
 * Cria a conta de acesso para uma ficha e envia o email de autenticação.
 * Com `resend`, se a conta já existir mas o email ainda não tiver sido confirmado,
 * reenvia o convite (respeitando o intervalo de 60 s do Supabase por utilizador).
 */
async function sendAccessInvite(
  recordId: string,
  redirectTo: string,
  opts: { resend?: boolean } = {},
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rec, error: re } = await supabaseAdmin
    .from("client_records")
    .select("id, user_id, name, nif, email")
    .eq("id", recordId)
    .maybeSingle();
  if (re || !rec) throw new Error("Ficha não encontrada.");
  if (rec.user_id) {
    if (!opts.resend) return { email: rec.email, invited: false, resent: false };
    const { data: existing, error: ge } = await supabaseAdmin.auth.admin.getUserById(rec.user_id);
    if (ge || !existing?.user) throw new Error("Não foi possível verificar a conta do cliente.");
    const u = existing.user;
    if (u.email_confirmed_at) return { email: rec.email, invited: false, resent: false };
    const target = (u.email ?? rec.email ?? "").trim();
    if (!target.includes("@")) throw new Error("A conta do cliente não tem um email válido.");
    const lastSent = u.invited_at ?? u.confirmation_sent_at ?? null;
    if (lastSent) {
      const wait = INVITE_COOLDOWN_SECONDS - Math.floor((Date.now() - new Date(lastSent).getTime()) / 1000);
      if (wait > 0) {
        throw new Error(`Aguarde ${wait} segundos antes de reenviar o convite.`);
      }
    }
    const { error: rie } = await supabaseAdmin.auth.admin.inviteUserByEmail(target, { redirectTo });
    if (rie) {
      if (isRateLimitError(rie)) {
        throw new Error(`Aguarde cerca de ${INVITE_COOLDOWN_SECONDS} segundos antes de reenviar o convite.`);
      }
      throw new Error(rie.message ?? "Não foi possível reenviar o convite.");
    }
    return { email: target, invited: true, resent: true };
  }
  const email = (rec.email ?? "").trim();
  if (!email.includes("@")) throw new Error("Preencha e guarde o email do cliente primeiro.");
  const { data: invited, error: ie } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });
  if (ie || !invited?.user) {
    if (isRateLimitError(ie)) {
      throw new Error(`Aguarde cerca de ${INVITE_COOLDOWN_SECONDS} segundos antes de tentar novamente.`);
    }
    throw new Error(ie?.message ?? "Não foi possível enviar o convite.");
  }
  const uid = invited.user.id;
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: uid, full_name: rec.name, nif: rec.nif || "", email });
  await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "cliente" });
  const { error: ue } = await supabaseAdmin
    .from("client_records")
    .update({ user_id: uid, folder_active: true })
    .eq("id", rec.id);
  if (ue) throw new Error(ue.message);
  await sendRulesEmailSafe(email, rec.name);
  return { email, invited: true, resent: false };
}

/** Ativa/desativa o cliente; ao ativar pela primeira vez envia o email de autenticação. */
export const setClientActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        active: z.boolean(),
        redirectTo: z.string().url(),
        email: z.string().trim().email("Introduza um email válido.").optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { error } = await context.supabase
      .from("client_records")
      .update(
        data.email
          ? { folder_active: data.active, email: data.email.toLowerCase() }
          : { folder_active: data.active },
      )
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (!data.active) return { invited: false, email: "" };
    return sendAccessInvite(data.id, data.redirectTo);
  });

/** Cria o acesso à área de cliente a partir de uma ficha e envia o convite. */
export const inviteFromRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), redirectTo: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const res = await sendAccessInvite(data.id, data.redirectTo, { resend: true });
    if (!res.invited) throw new Error("Este cliente já tem acesso.");
    return { email: res.email, resent: res.resent };
  });

/** Estado do acesso do cliente (conta confirmada?) e data de aceitação das regras. Só administradores. */
export const getClientAccessInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rec, error } = await supabaseAdmin
      .from("client_records")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !rec) throw new Error("Ficha não encontrada.");
    if (!rec.user_id) {
      return {
        hasAccount: false,
        confirmed: false,
        lastInviteAt: null as string | null,
        rulesAcceptedAt: null as string | null,
        rulesVersion: null as string | null,
      };
    }
    const { data: au } = await supabaseAdmin.auth.admin.getUserById(rec.user_id);
    const u = au?.user;
    const { data: acc } = await context.supabase
      .from("rules_acceptances")
      .select("accepted_at, version")
      .eq("user_id", rec.user_id)
      .order("accepted_at", { ascending: false })
      .limit(1);
    return {
      hasAccount: true,
      confirmed: Boolean(u?.email_confirmed_at),
      lastInviteAt: (u?.invited_at ?? u?.confirmation_sent_at ?? null) as string | null,
      rulesAcceptedAt: (acc?.[0]?.accepted_at ?? null) as string | null,
      rulesVersion: (acc?.[0]?.version ?? null) as string | null,
    };
  });
