import { createFileRoute } from "@tanstack/react-router";

/** Vercel invokes GET with its own CRON_SECRET; managed POST jobs remain unchanged. */
export const Route = createFileRoute("/api/public/jobs/vercel")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateVercelCron, isMonthlySubmissionTime } = await import("@/lib/vercel-cron.server");
        const authFailure = await authenticateVercelCron(request, process.env["CRON_SECRET"]);
        if (authFailure) return authFailure;
        const now = new Date();
        let coreFailed = false;
        try {
          // Keep-alive: minimal read so the backend registers daily activity.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("user_roles").select("user_id", { head: true, count: "exact" }).limit(1);
          const { autoSubmitExpiredUnlocks, autoSubmitPendingMonths } = await import("@/lib/submission-email.server");
          await autoSubmitExpiredUnlocks(now);
          if (isMonthlySubmissionTime(now)) await autoSubmitPendingMonths(now);
        } catch {
          coreFailed = true;
          console.error("[cron] processamento de submissões falhou");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) Lembrete do dia 8 (Lisboa), sem pg_cron/pg_net/verify_reminder_token.
        try {
          const parts = Object.fromEntries(
            new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "numeric" })
              .formatToParts(now)
              .map((p) => [p.type, p.value]),
          );
          if (Number(parts["day"]) === 8) {
            const { sendMonthlyReminders } = await import("@/lib/submission-email.server");
            const { sent, failed } = await sendMonthlyReminders(`${parts["year"]}-${parts["month"]}`);
            console.log(`[cron] lembrete dia 8: enviados=${sent} falhas=${failed}`);
          }
        } catch {
          console.error("[cron] lembrete dia 8 falhou");
        }

        // 2) contact_messages com mais de 12 meses.
        try {
          const cutoff = new Date(now);
          cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
          const { error } = await supabaseAdmin.from("contact_messages").delete().lt("created_at", cutoff.toISOString());
          if (error) console.error(`[cron] limpeza contact_messages falhou (${error.code ?? "erro"})`);
        } catch {
          console.error("[cron] limpeza contact_messages falhou");
        }

        // 3) statement_conversions com mais de 30 dias (não toca em documentos nem armazenamento).
        try {
          const cutoff = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
          const { error } = await supabaseAdmin.from("statement_conversions").delete().lt("created_at", cutoff);
          if (error) console.error(`[cron] limpeza statement_conversions falhou (${error.code ?? "erro"})`);
        } catch {
          console.error("[cron] limpeza statement_conversions falhou");
        }

        if (coreFailed) {
          return Response.json({ error: "Não foi possível concluir o processamento automático." }, { status: 500 });
        }
        return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});