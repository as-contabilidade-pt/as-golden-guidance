import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/site/Logo";
import { supabase } from "@/integrations/supabase/client";
import { getSessionInfo } from "@/lib/portal.functions";

type RecordInfo = {
  client_number: string;
  name: string;
  nif: string;
  email: string;
  phone: string;
  responsible_name: string;
  address: string;
  postal_code: string;
  locality: string;
  folder_active: boolean;
} | null;

type SessionInfo = {
  email: string;
  profile: { full_name?: string | null; nif?: string | null; email?: string | null } | null;
  isAdmin: boolean;
  record: RecordInfo;
};

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 max-w-[60%] [overflow-wrap:anywhere] text-right text-xs text-foreground">{value}</span>
    </div>
  );
}

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const homeTo = pathname.startsWith("/admin") ? "/admin" : "/documentos";
  const [firstName, setFirstName] = useState<string | null>(null);
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/login", replace: true });
  }

  useEffect(() => {
    let active = true;
    getSessionInfo()
      .then((raw) => {
        if (!active) return;
        const session = raw as unknown as SessionInfo;
        setInfo(session);
        const fullName =
          session.record?.name ||
          session.profile?.full_name ||
          session.email.split("@")[0] ||
          "";
        const first = fullName.trim().split(/\s+/)[0];
        if (first) setFirstName(first);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const el = event.target as HTMLElement | null;
      if (!el?.closest("[data-user-menu]")) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const details = (() => {
    if (!info) return null;
    const r = info.record;
    if (r) {
      const rows: Array<[string, string]> = [
        ["Cliente", r.client_number],
        ["Nome", r.name],
        ["NIF", r.nif],
        ["Email", r.email],
        ["Telefone", r.phone],
        ["Responsável", r.responsible_name],
        ["Morada", r.address],
        ["Código postal", r.postal_code],
        ["Localidade", r.locality],
      ];
      return (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-foreground">Os seus dados</span>
            <span
              className={
                "rounded-full border px-2 py-0.5 text-[10px] " +
                (r.folder_active
                  ? "border-gold/40 text-gold"
                  : "border-border text-muted-foreground")
              }
            >
              {r.folder_active ? "Pasta ativa" : "Sem pasta"}
            </span>
          </div>
          <div className="mt-2 divide-y divide-border/60">
            {rows.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </div>
        </>
      );
    }
    return (
      <>
        <span className="text-xs font-medium text-foreground">
          {info.isAdmin ? "Dados da conta" : "Os seus dados"}
        </span>
        <div className="mt-2 divide-y divide-border/60">
          <Row
            label="Nome"
            value={info.profile?.full_name || info.email.split("@")[0] || ""}
          />
          {info.isAdmin ? <Row label="Perfil" value="Administradora" /> : null}
          <Row label="Email" value={info.email} />
          {info.profile?.nif ? <Row label="NIF" value={info.profile.nif} /> : null}
        </div>
      </>
    );
  })();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-gold/15 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-4 py-4 sm:flex sm:justify-between sm:px-5">
          <Link to={homeTo} className="flex min-w-0 shrink-0 items-center gap-3">
            <Logo size={34} />
            <span className="hidden font-serif text-sm text-foreground sm:block">
              AS <span className="ml-1 text-xs text-gold">Contabilidade</span>
            </span>
          </Link>
          {firstName ? (
            <div data-user-menu className="relative min-w-0 justify-self-end">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex min-h-11 max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 sm:text-sm"
                aria-expanded={open}
              >
                <span className="min-w-0 truncate">
                  Bem-vindo, <span className="text-foreground">{firstName}</span>
                </span>
                <ChevronDown
                  className={
                    "size-3.5 shrink-0 text-gold transition-transform duration-200 " +
                    (open ? "rotate-180" : "")
                  }
                />
              </button>
              {open && details ? (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-gold/20 bg-card p-4 shadow-xl sm:w-80">
                  {details}
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                  >
                    <LogOut className="size-3.5" />
                    Terminar sessão
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-5 sm:py-14">
        <div className="grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="[overflow-wrap:anywhere] font-serif text-3xl text-foreground sm:text-4xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
        <div className="mt-8 min-w-0 sm:mt-10">{children}</div>
      </main>
    </div>
  );
}
