import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const categoryEnum = z.enum([
  "faturas_compras",
  "faturas_vendas",
  "extratos_bancarios",
  "documentos_salarios",
  "outros_documentos",
]);

async function isAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return data === true;
}

export const getSessionInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, full_name, nif, email")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      userId: context.userId,
      email: (context.claims as { email?: string }).email ?? profile?.email ?? "",
      profile: profile ?? null,
      isAdmin: await isAdmin(context),
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
      .select("id, label, original_name, storage_path, size_bytes, created_at")
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
    listSchema.extend({ originalName: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const target = admin && data.clientId ? data.clientId : context.userId;

    if (!data.originalName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Apenas são aceites ficheiros PDF.");
    }

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
        })
        .select("id, label, storage_path")
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
      .select("id, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Documento não encontrado.");

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

    return { id: invited.user.id };
  });
