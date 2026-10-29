// Edge Function do Supabase (publicada com o nome "rapid-endpoint"): lê um extrato bancário em PDF com a IA e devolve os movimentos.
// Corre no Supabase porque aguenta pedidos longos (o alojamento do site corta aos 10 s).
// Segredo necessário (Edge Functions → Secrets): ANTHROPIC_API_KEY
import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";

const CLAUDE_MODEL = "claude-sonnet-5-5";
const CLAUDE_TIMEOUT_MS = 140_000;

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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
const fail = (message: string, status = 400) => reply({ error: message }, status);

type Row = { data: string; descricao: string; debito: string; credito: string; saldo: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Método não permitido.", 405);

  // 1. Só administradores autenticados.
  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return fail("Sessão inválida.", 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return fail("Sessão inválida.", 401);
  const userId = userData.user.id;
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin !== true) return fail("Acesso restrito.", 403);

  // 2. Pedido.
  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return fail("Pedido inválido.");
  }
  const filename = typeof input.filename === "string" && input.filename ? input.filename.slice(0, 300) : "Extrato.pdf";
  const clientName = typeof input.clientName === "string" ? input.clientName.trim().slice(0, 200) : "";
  const documentId = typeof input.documentId === "string" && UUID.test(input.documentId) ? input.documentId : null;
  let fileData = typeof input.fileData === "string" && input.fileData.length > 10 ? input.fileData : null;

  if (!fileData && documentId) {
    const { data: doc } = await admin.from("documents").select("storage_path").eq("id", documentId).maybeSingle();
    if (!doc) return fail("Documento não encontrado.", 404);
    const { data: blob, error } = await admin.storage.from("documentos").download(doc.storage_path);
    if (error || !blob) return fail("Não foi possível abrir o documento do cliente.", 404);
    fileData = Buffer.from(await blob.arrayBuffer()).toString("base64");
  }
  if (!fileData) return fail("Nenhum ficheiro indicado.");

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return fail("Serviço de processamento não configurado.", 500);

  // 3. IA.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileData } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return fail("O extrato demorou demasiado a processar. Tente novamente.", 504);
    return fail("Não foi possível contactar o serviço de processamento.", 502);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) return fail("Chave de acesso ao serviço de processamento inválida ou sem permissões.", 502);
    if (res.status === 402) return fail("Créditos de IA insuficientes para processar o extrato. É necessário reforçar os créditos.", 502);
    if (res.status === 429) return fail("Demasiados pedidos em simultâneo. Tente novamente dentro de um minuto.", 429);
    return fail(`Falha no processamento do extrato (${res.status}). ${body.slice(0, 300)}`, 502);
  }

  const payload = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = (payload.content ?? []).filter((b) => b?.type === "text").map((b) => b.text ?? "").join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return fail("Não foi possível interpretar os movimentos do extrato.", 502);

  let parsed: { movimentos?: unknown };
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return fail("Resposta inválida do processamento. Tente novamente.", 502);
  }

  const clean = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
  const rows: Row[] = (Array.isArray(parsed.movimentos) ? parsed.movimentos : []).map((r) => {
    const row = (r ?? {}) as Record<string, unknown>;
    return {
      data: clean(row["data"]),
      descricao: clean(row["descricao"]),
      debito: clean(row["debito"]),
      credito: clean(row["credito"]),
      saldo: clean(row["saldo"]),
    };
  });

  // 4. Histórico.
  const { data: saved, error: historyError } = await admin
    .from("statement_conversions")
    .insert({
      created_by: userId,
      client_name: clientName,
      filename,
      source_document_id: documentId,
      rows,
      row_count: rows.length,
    })
    .select("id")
    .maybeSingle();
  if (historyError) console.error("statement history save failed", historyError.message);

  return reply({ rows, historyId: (saved?.id as string | undefined) ?? null });
});
