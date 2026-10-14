import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** De hora a hora: fecha reaberturas cujo prazo terminou e submete automaticamente. */
export const Route = createFileRoute("/api/public/jobs/fecho-reaberturas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { autoSubmitExpiredUnlocks } = await import("@/lib/submission-email.server");
        return Response.json(await autoSubmitExpiredUnlocks());
      },
    },
  },
});
