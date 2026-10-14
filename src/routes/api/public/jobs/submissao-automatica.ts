import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Dia 10: submete automaticamente os meses anteriores não submetidos (só às 09:00 de Lisboa). */
export const Route = createFileRoute("/api/public/jobs/submissao-automatica")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const hour = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Lisbon",
            hour: "numeric",
            hour12: false,
          }).format(new Date()),
        ) % 24;
        if (hour !== 9) return Response.json({ skipped: true });
        const { autoSubmitPendingMonths } = await import("@/lib/submission-email.server");
        return Response.json(await autoSubmitPendingMonths());
      },
    },
  },
});
