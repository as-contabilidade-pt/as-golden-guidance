import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";

export function PortalShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-gold/15 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={34} />
            <span className="hidden font-serif text-sm text-foreground sm:block">
              AS <span className="ml-1 text-xs text-gold">Contabilidade</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-foreground sm:text-4xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
