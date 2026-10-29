import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  clientId: z.string().uuid().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  category: z.string().min(1).max(100).optional(),
  fromKey: z.number().int().optional(),
  toKey: z.number().int().optional(),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Acesso restrito.");
}

export const listBackupClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("profiles").select("id, full_name, nif").order("full_name");
    const { data: ad } = await context.supabase.from("user_roles").select("user_id").eq("role", "admin");
    const admins = new Set((ad ?? []).map((r: any) => r.user_id));
    return (data ?? []).filter((p: any) => !admins.has(p.id)) as { id: string; full_name: string; nif: string }[];
  });

export const buildBackupManifest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const filt = (q: any) => {
      if (data.clientId) q = q.eq("user_id", data.clientId);
      if (data.year) q = q.eq("year", data.year);
      if (data.month) q = q.eq("month", data.month);
      if (data.fromKey !== undefined) q = q.gte("year", Math.floor(data.fromKey / 12));
      if (data.toKey !== undefined) q = q.lte("year", Math.floor(data.toKey / 12));
      return q;
    };
    const [docs, subs, reqs, profiles, cats] = await Promise.all([
      filt(sb.from("documents").select("*")).order("year").order("month"),
      filt(sb.from("month_submissions").select("*")),
      filt(sb.from("unlock_requests").select("*")),
      sb.from("profiles").select("id, full_name, nif, email"),
      sb.from("document_categories").select("slug, label"),
    ]);
    let recQ = sb.from("client_records").select("*");
    if (data.clientId) recQ = recQ.eq("user_id", data.clientId);
    const records = await recQ;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inRange = (r: any) => {
      const k = r.year * 12 + (r.month - 1);
      return (data.fromKey === undefined || k >= data.fromKey) && (data.toKey === undefined || k <= data.toKey);
    };
    const docRows = ((docs.data ?? []) as any[]).filter(inRange).filter((r) => !data.category || r.category === data.category);
    subs.data = (subs.data ?? []).filter(inRange);
    reqs.data = (reqs.data ?? []).filter(inRange);
    const paths = docRows.map((d) => d.storage_path);
    const urls: Record<string, string> = {};
    for (let i = 0; i < paths.length; i += 100) {
      const { data: signed } = await supabaseAdmin.storage
        .from("documentos").createSignedUrls(paths.slice(i, i + 100), 3600);
      for (const s of signed ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
    }
    return {
      documents: docRows.map((d) => ({ ...d, url: urls[d.storage_path] ?? null })),
      submissions: subs.data ?? [],
      requests: reqs.data ?? [],
      profiles: profiles.data ?? [],
      categories: cats.data ?? [],
      records: records.data ?? [],
    };
  });
