import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { friendlyError } from "@/lib/friendly-error";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    if (resetError) setError("Não foi possível enviar o email de recuperação.");
    else setNotice("Enviámos um email com instruções para definir uma nova palavra-passe.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-24">
      <div className="w-full max-w-md rounded-[2.5rem] bg-card p-10 shadow-[0_24px_70px_-24px_color-mix(in_oklab,var(--ink)_12%,transparent)] ring-1 ring-gold/15 sm:p-12">
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
            <input
              id="password"
              type="password"
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
          className="mt-5 w-full text-center text-xs text-gold underline underline-offset-2"
        >
          Esqueci-me da palavra-passe
        </button>

        <p className="mt-8 text-center text-xs text-muted-foreground/80">
          As contas são criadas pela AS Contabilidade. Em caso de dúvida, contacte-nos pelo{" "}
          <a href="tel:+351965378291" className="text-gold underline underline-offset-2">
            965 378 291
          </a>
          .
        </p>
      </div>
    </main>
  );
}
