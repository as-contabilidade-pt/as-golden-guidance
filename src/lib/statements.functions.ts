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

// Modelo Claude utilizado na extração. Alterar aqui para mudar de modelo.
const CLAUDE_MODEL = "claude-sonnet-5-5";

export const extractBankStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Acesso restrito.");

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
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: data.fileData,
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
