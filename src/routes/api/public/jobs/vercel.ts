import { createFileRoute } from "@tanstack/react-router";

/** Vercel invokes GET with its own CRON_SECRET; managed POST jobs remain unchanged. */
export const Route = createFileRoute("/api/public/jobs/vercel")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateVercelCron, isMonthlySubmissionTime } = await import("@/lib/vercel-cron.server");
        const authFailure = await authenticateVercelCron(request, process.env["CRON_SECRET"]);
        if (authFailure) return authFailure;
        try {
          const now = new Date();
          const { autoSubmitExpiredUnlocks, autoSubmitPendingMonths } = await import("@/lib/submission-email.server");
          await autoSubmitExpiredUnlocks(now);
          if (isMonthlySubmissionTime(now)) await autoSubmitPendingMonths(now);
          return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
        } catch {
          return Response.json({ error: "Não foi possível concluir o processamento automático." }, { status: 500 });
        }
      },
    },
  },
});