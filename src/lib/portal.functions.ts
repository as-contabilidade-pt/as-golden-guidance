import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isMonthPastDeadline,
  unlockIsActive,
  buildUnlockDeclaration,
  buildSubmissionDeclaration,
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

async function monthIsWritable(
  context: { supabase: any },
  userId: string,
  year: number,
  month: number,
) {
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
            "client_number, name, nif, email, phone, responsible_name, address, postal_code, locality, notes, folder_active",
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
        supplier: z.string().trim().min(1).max(80),
        docDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const target = admin && data.clientId ? data.clientId : context.userId;

    if (!admin && !(await monthIsWritable(context, target, data.year, data.month))) {
      throw new Error("Esta pasta está bloqueada. Peça o desbloqueio do mês.");
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

    const lateEntry =
      isMonthPastDeadline(data.year, data.month) ||
      (await monthIsSubmitted(context, target, data.year, data.month));
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
      const label = `${String(data.month).padStart(2, "0")}-${String(seq).padStart(2, "0")}`;
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
          supplier: data.supplier.trim(),
          doc_date: data.docDate ?? null,
          late: lateEntry,
          late_submitted_at: lateAt,
        })
        .select("id, label, storage_path, supplier, doc_date, late, late_submitted_at")
        .single();

      if (!error && inserted) return inserted;
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
      throw new Error("Esta pasta está bloqueada. Não é possível remover documentos.");
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
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Documento não encontrado.");

    const { data: signed, error: signError } = await context.supabase.storage
      .from("documentos")
      .createSignedUrl(doc.storage_path, 60);
    if (signError || !signed) throw new Error(signError?.message ?? "Erro ao gerar ligação.");
    return { url: signed.signedUrl };
  });

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, nif, email, created_at")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
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
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        responsibleName: z.string().trim().max(120).optional(),
        declarationAccepted: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { count, error: countError } = await context.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("year", data.year)
      .eq("month", data.month);
    if (countError) throw new Error(countError.message);
    if (!count) {
      throw new Error("Anexe pelo menos um documento antes de submeter o mês.");
    }

    const identity = await clientIdentity(context, context.userId);
    const responsibleName = data.responsibleName?.trim() || identity.responsibleName;
    const at = new Date().toISOString();
    const declarationText = buildSubmissionDeclaration({
      nif: identity.nif,
      companyName: identity.companyName,
      responsibleName,
      year: data.year,
      month: data.month,
      at,
    });

    const payload = {
      user_id: context.userId,
      nif: identity.nif,
      company_name: identity.companyName,
      responsible_name: responsibleName,
      declaration_text: declarationText,
      year: data.year,
      month: data.month,
      declaration_accepted: true,
      document_count: count,
    };

    const alreadySubmitted = await monthIsSubmitted(context, context.userId, data.year, data.month);
    let row: { id: string; year: number; month: number; submitted_at: string; document_count: number };
    if (alreadySubmitted) {
      // Re-submissão só permitida após reabertura aprovada pelo gabinete.
      if (!(await monthIsWritable(context, context.userId, data.year, data.month))) {
        throw new Error("Esta documentação já foi submetida.");
      }
      // Permissão já verificada acima; escrita feita no servidor de forma fiável.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: upd, error } = await supabaseAdmin
        .from("month_submissions")
        .update({ ...payload, submitted_at: at })
        .eq("user_id", context.userId)
        .eq("year", data.year)
        .eq("month", data.month)
        .select("id, year, month, submitted_at, document_count")
        .limit(1);
      if (error) throw new Error(error.message);
      if (!upd?.[0]) throw new Error("Não foi possível atualizar a submissão.");
      row = upd[0];
    } else {
      const { data: ins, error } = await context.supabase
        .from("month_submissions")
        .insert(payload)
        .select("id, year, month, submitted_at, document_count")
        .single();
      if (error) {
        if (error.message.includes("duplicate")) {
          throw new Error("Esta documentação já foi submetida.");
        }
        throw new Error(error.message);
      }
      row = ins;
    }

    // A reabertura termina com a nova submissão: a pasta volta a bloquear.
    {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("unlock_requests")
        .update({ status: "fechado" })
        .eq("user_id", context.userId)
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
        documentCount: count,
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

export const listCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ clientId: z.string().uuid().optional(), all: z.boolean().optional() })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
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
  categories: z.array(categoryEnum).max(50).nullable().optional(),
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
    return data ?? [];
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
  .inputValidator((d: unknown) => recordSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: row, error } = await context.supabase
      .from("client_records")
      .insert(recordColumns(data))
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    recordSchema.extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("client_records")
      .update(recordColumns(rest))
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { error } = await context.supabase.from("client_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const importClientRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(recordSchema).min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { error } = await context.supabase
      .from("client_records")
      .insert(data.rows.map(recordColumns));
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

/** Cria o acesso à área de cliente a partir de uma ficha e envia o convite. */
export const inviteFromRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), redirectTo: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Acesso restrito.");
    const { data: rec, error: re } = await context.supabase
      .from("client_records")
      .select("id, user_id, name, nif, email")
      .eq("id", data.id)
      .maybeSingle();
    if (re || !rec) throw new Error("Ficha não encontrada.");
    if (rec.user_id) throw new Error("Este cliente já tem acesso.");
    const email = (rec.email ?? "").trim();
    if (!email.includes("@")) throw new Error("Preencha e guarde o email do cliente primeiro.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error: ie } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: data.redirectTo,
    });
    if (ie || !invited?.user) throw new Error(ie?.message ?? "Não foi possível enviar o convite.");
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
    return { email };
  });
