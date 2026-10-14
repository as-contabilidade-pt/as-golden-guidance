import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  fileData: z.string().min(10).optional(),
  documentId: z.string().uuid().optional(),
  clientName: z.string().max(200).optional(),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin !== true) throw new Error("Acesso restrito.");
}

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export type StatementRow = {
  data: string;
  descricao: string;
  debito: string;
  credito: string;
  saldo: string;
};

const PROMPT = `És um assistente de contabilidade em Portugal. Analisa o extrato bancário em PDF em anexo (pode ser de qualquer banco português e ter várias páginas).

Extrai TODOS os movimentos/transações reais. Ignora cabeçalhos, rodapés, totais, resumos e linhas que não sejam movimentos.

Para cada movimento devolve:
- data: data do movimento (data valor se existir), sempre no formato DD/MM/AAAA
- descricao: descrição do movimento em texto simples
- debito: valor de saída, número decimal com ponto (ex: "1234.56"); string vazia se não aplicável
- credito: valor de entrada, número decimal com ponto; string vazia se não aplicável
- saldo: saldo após o movimento, número decimal com ponto; string vazia se não existir no extrato

Sem separadores de milhares. Sem símbolos de moeda. Responde APENAS com json válido no formato:
{"movimentos":[{"data":"","descricao":"","debito":"","credito":"","saldo":""}]}`;

// Modelo Claude utilizado na extração. Alterar aqui para mudar de modelo.
const CLAUDE_MODEL = "claude-sonnet-5-5";

export const extractBankStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    let fileData = data.fileData;
    if (!fileData && data.documentId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: doc } = await supabaseAdmin
        .from("documents")
        .select("storage_path")
        .eq("id", data.documentId)
        .maybeSingle();
      if (!doc) throw new Error("Documento não encontrado.");
      const { data: blob, error } = await supabaseAdmin.storage
        .from("documentos")
        .download(doc.storage_path);
      if (error || !blob) throw new Error("Não foi possível abrir o documento do cliente.");
      fileData = toBase64(await blob.arrayBuffer());
    }
    if (!fileData) throw new Error("Nenhum ficheiro indicado.");

    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("Serviço de processamento não configurado.");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: fileData,
                },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error("Chave de acesso ao serviço de processamento inválida ou sem permissões.");
      }
      if (res.status === 402) {
        throw new Error(
          "Créditos de IA insuficientes para processar o extrato. É necessário reforçar os créditos.",
        );
      }
      if (res.status === 429) {
        throw new Error("Demasiados pedidos em simultâneo. Tente novamente dentro de um minuto.");
      }
      throw new Error(`Falha no processamento do extrato (${res.status}). ${body.slice(0, 300)}`);
    }

    const payload = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = (payload.content ?? [])
      .filter((block) => block?.type === "text")
      .map((block) => block.text ?? "")
      .join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Não foi possível interpretar os movimentos do extrato.");
    }


    let parsed: { movimentos?: unknown };
    try {
      parsed = JSON.parse(text.slice(start, end + 1)) as { movimentos?: unknown };
    } catch {
      throw new Error("Resposta inválida do processamento. Tente novamente.");
    }

    const rows = Array.isArray(parsed.movimentos) ? parsed.movimentos : [];
    const clean = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

    const mapped = rows.map((r) => {
        const row = (r ?? {}) as Record<string, unknown>;
        return {
          data: clean(row["data"]),
          descricao: clean(row["descricao"]),
          debito: clean(row["debito"]),
          credito: clean(row["credito"]),
          saldo: clean(row["saldo"]),
        } satisfies StatementRow;
      });

    const { data: saved, error: historyError } = await context.supabase
      .from("statement_conversions")
      .insert({
        created_by: context.userId,
        client_name: data.clientName?.trim() ?? "",
        filename: data.filename,
        source_document_id: data.documentId ?? null,
        rows: mapped,
        row_count: mapped.length,
      })
      .select("id")
      .maybeSingle();

    if (historyError) console.error("statement history save failed", historyError.message);
    return { rows: mapped, historyId: (saved?.id as string | undefined) ?? null };
  });

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
    try {
      await context.supabase.from("statement_conversions").delete().lt("created_at", since);
    } catch {
      // histórico indisponível: ignorar limpeza
    }
    const { data, error } = await context.supabase
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
    const { error } = await context.supabase
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
    await context.supabase.from("statement_conversions").delete().eq("id", data.id);
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
