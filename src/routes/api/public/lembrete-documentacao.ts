import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint da tarefa agendada (dia 8 de cada mês): envia o lembrete de prazo
 * a todos os clientes com pasta de submissão ativa.
 */
export const Route = createFileRoute("/api/public/lembrete-documentacao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["REMINDER_CRON_SECRET"];
        if (!secret) return new Response("Server configuration error", { status: 500 });

        const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token || token !== secret) return new Response("Unauthorized", { status: 401 });

        const { sendMonthlyReminders } = await import("@/lib/submission-email.server");
        const result = await sendMonthlyReminders();
        return Response.json(result);
      },
    },
  },
});
