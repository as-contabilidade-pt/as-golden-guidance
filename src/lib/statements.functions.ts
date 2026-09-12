import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  fileData: z.string().min(10),
});

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

export const extractBankStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Acesso restrito.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Serviço de processamento não configurado.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "file",
                file: {
                  filename: data.filename,
                  file_data: `data:${data.mimeType};base64,${data.fileData}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
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
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
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

    return {
      rows: rows.map((r) => {
        const row = (r ?? {}) as Record<string, unknown>;
        return {
          data: clean(row["data"]),
          descricao: clean(row["descricao"]),
          debito: clean(row["debito"]),
          credito: clean(row["credito"]),
          saldo: clean(row["saldo"]),
        } satisfies StatementRow;
      }),
    };
  });
