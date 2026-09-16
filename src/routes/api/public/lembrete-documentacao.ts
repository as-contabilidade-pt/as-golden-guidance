import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint da tarefa agendada (dia 8 de cada mês): envia o lembrete de prazo
 * a todos os clientes com pasta de submissão ativa.
 * A chave da tarefa é validada no servidor, sem nunca ser exposta ao cliente.
 */
export const Route = createFileRoute("/api/public/lembrete-documentacao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: valid, error } = await supabaseAdmin.rpc("verify_reminder_token", {
          _token: token,
        });
        if (error) return new Response("Server error", { status: 500 });
        if (valid !== true) return new Response("Unauthorized", { status: 401 });

        const { sendMonthlyReminders } = await import("@/lib/submission-email.server");
        const result = await sendMonthlyReminders();
        return Response.json(result);
      },
    },
  },
});
