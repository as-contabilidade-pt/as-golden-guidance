import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin !== true) throw new Error("Acesso restrito.");
}

export type StatementRow = {
  data: string;
  descricao: string;
  debito: string;
  credito: string;
  saldo: string;
};

export type HistoryItem = {
  id: string;
  client_name: string;
  filename: string;
  row_count: number;
  created_at: string;
  rows: StatementRow[];
};

export const listStatementHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    try {
      await db.from("statement_conversions").delete().lt("created_at", since);
    } catch {
      // histórico indisponível: ignorar limpeza
    }
    const { data, error } = await db
      .from("statement_conversions")
      .select("id, client_name, filename, row_count, created_at, rows")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("statement history unavailable", error.message);
      return [] as HistoryItem[];
    }
    return (data ?? []) as unknown as HistoryItem[];
  });

export const updateStatementHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        clientName: z.string().max(200),
        rows: z.array(
          z.object({
            data: z.string(),
            descricao: z.string(),
            debito: z.string(),
            credito: z.string(),
            saldo: z.string(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db
      .from("statement_conversions")
      .update({ rows: data.rows, row_count: data.rows.length, client_name: data.clientName })
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível guardar as alterações.");
    return { ok: true };
  });

export const deleteStatementHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await db.from("statement_conversions").delete().eq("id", data.id);
    return { ok: true };
  });

export type ClientStatement = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  original_name: string;
  label: string;
  created_at: string;
  client_name: string;
  nif: string;
};

export const listClientStatements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: docs, error } = await context.supabase
      .from("documents")
      .select("id, user_id, year, month, original_name, label, created_at")
      .eq("category", "extratos_bancarios")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os extratos dos clientes.");
    const ids = [...new Set((docs ?? []).map((d: any) => d.user_id))];
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, full_name, nif").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (docs ?? []).map((d: any) => ({
      ...d,
      client_name: (map.get(d.user_id) as any)?.full_name ?? "Cliente",
      nif: (map.get(d.user_id) as any)?.nif ?? "",
    })) as ClientStatement[];
  });

export const getClientStatementUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Documento não encontrado.");
    const { data: signed } = await supabaseAdmin.storage
      .from("documentos")
      .createSignedUrl(doc.storage_path, 300);
    if (!signed?.signedUrl) throw new Error("Não foi possível abrir o documento.");
    return { url: signed.signedUrl };
  });
