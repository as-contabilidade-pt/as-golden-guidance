import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Route guard: only admins may enter admin pages; others go to their own area. */
export async function requireAdmin() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw redirect({ to: "/login", replace: true });
  const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (data !== true) throw redirect({ to: "/documentos", replace: true });
}
