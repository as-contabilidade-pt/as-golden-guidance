import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Área de Cliente — AS Contabilidade" },
      {
        name: "description",
        content:
          "Área de Cliente da AS — Contabilidade, Fiscalidade e Gestão, em Viseu. Entre para enviar e consultar os seus documentos.",
      },
      { property: "og:title", content: "Área de Cliente — AS Contabilidade" },
      {
        property: "og:description",
        content: "Entre para enviar e consultar os seus documentos em segurança.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/** Intervalo mínimo entre pedidos de recuperação (o Supabase só envia 1 email por minuto). */
const RESET_COOLDOWN_SECONDS = 60;
const RESET_STORAGE_KEY = "as-reset-cooldown-until";

function readCooldownEnd(): number {
  try {
    const raw = window.localStorage.getItem(RESET_STORAGE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeCooldownEnd(ts: number) {
  try {
    window.localStorage.setItem(RESET_STORAGE_KEY, String(ts));
  } catch {
    /* armazenamento indisponível: o contador continua a funcionar em memória */
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));

  useEffect(() => {
    setCooldownEnd(readCooldownEnd());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (cooldownEnd <= Date.now()) return;
    const t = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(t);
  }, [cooldownEnd]);

  function startCooldown() {
    const end = Date.now() + RESET_COOLDOWN_SECONDS * 1000;
    writeCooldownEnd(end);
    setCooldownEnd(end);
    setNow(Date.now());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !data.user) {
        throw new Error("Email ou palavra-passe incorretos.");
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      navigate({ to: isAdmin ? "/admin" : "/documentos", replace: true });
    } catch (err) {
      setError(friendlyError(err, "Não foi possível iniciar sessão."));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (secondsLeft > 0 || busy) return;
    if (!email) {
      setError("Escreva o seu email para receber a ligação de recuperação.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/definir-password`,
    });
    setBusy(false);
    if (resetError) {
      const limited =
        resetError.status === 429 ||
        resetError.code === "over_email_send_rate_limit" ||
        /rate limit|only request this after|too many/i.test(resetError.message ?? "");
      if (limited) {
        startCooldown();
        setError("Já pedimos um email há instantes. Aguarde um minuto antes de pedir outro.");
      } else {
        setError("Não foi possível enviar o email de recuperação.");
      }
      return;
    }
    startCooldown();
    setNotice(
      "Se o email estiver registado, enviámos instruções para definir uma nova palavra-passe. Verifique também a pasta de spam.",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-24">
      <div className="w-full max-w-md rounded-[2.5rem] bg-card p-6 shadow-[0_24px_70px_-24px_color-mix(in_oklab,var(--ink)_12%,transparent)] ring-1 ring-gold/15 sm:p-12">
        <Link
          to="/"
          className="inline-flex rounded-full bg-secondary px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-foreground/70 transition-colors hover:text-gold"
        >
          ← Voltar ao site
        </Link>

        <h1 className="mt-6 font-serif text-3xl text-foreground sm:text-4xl">Área de Cliente</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Entre com o email que lhe foi comunicado para aceder aos seus documentos.
        </p>

        {error ? (
          <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3 text-sm text-foreground">
            {notice}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-medium text-foreground/80">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
              placeholder="nome@empresa.pt"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-medium text-foreground/80">
              Palavra-passe
            </label>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-medium text-ink transition-all hover:bg-gold-deep disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Entrar
          </button>
        </form>

        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={busy || secondsLeft > 0}
          aria-live="polite"
          className="mt-5 w-full text-center text-xs text-gold underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
        >
          {secondsLeft > 0
            ? `Pode pedir novo email dentro de ${secondsLeft} s`
            : "Esqueci-me da palavra-passe"}
        </button>

        <p className="mt-8 text-center text-xs text-muted-foreground/80">
          As contas são criadas pela AS Contabilidade. Em caso de dúvida, contacte-nos pelo{" "}
          <a href="tel:+351965378291" className="text-gold underline underline-offset-2">
            965 378 291
          </a>
          .
        </p>
        <p className="mt-4 text-center text-[11px] text-muted-foreground/70">
          <Link to="/politica-de-privacidade" className="hover:text-gold">
            Política de Privacidade
          </Link>
          {" · "}
          <Link to="/politica-de-cookies" className="hover:text-gold">
            Política de Cookies
          </Link>
          {" · "}
          <Link to="/termos" className="hover:text-gold">
            Termos e Condições
          </Link>
        </p>
      </div>
    </main>
  );
}
