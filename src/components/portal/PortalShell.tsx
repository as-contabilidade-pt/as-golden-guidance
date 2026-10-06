import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";
import { getSessionInfo } from "@/lib/portal.functions";

export function PortalShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const homeTo = pathname.startsWith("/admin") ? "/admin" : "/documentos";
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSessionInfo()
      .then((info) => {
        if (!active) return;
        const fullName =
          (info as { profile?: { full_name?: string | null } | null }).profile
            ?.full_name ?? "";
        const first = fullName.trim().split(/\s+/)[0];
        if (first) setFirstName(first);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-gold/15 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to={homeTo} className="flex items-center gap-3">
            <Logo size={34} />
            <span className="hidden font-serif text-sm text-foreground sm:block">
              AS <span className="ml-1 text-xs text-gold">Contabilidade</span>
            </span>
          </Link>
          {firstName ? (
            <span className="text-xs text-muted-foreground sm:text-sm">
              Bem-vindo, <span className="text-foreground">{firstName}</span>
            </span>
          ) : null}
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
