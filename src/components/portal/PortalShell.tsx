import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";

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
