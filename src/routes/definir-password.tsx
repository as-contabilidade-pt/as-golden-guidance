import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/definir-password")({
  ssr: false,
  component: SetPasswordPage,
  head: () => ({
    meta: [
      { title: "Definir Palavra-passe — AS Contabilidade" },
      {
        name: "description",
        content:
          "Defina a sua palavra-passe para aceder à Área de Cliente da AS — Contabilidade, Fiscalidade e Gestão.",
      },
      { property: "og:title", content: "Definir Palavra-passe — AS Contabilidade" },
      { property: "og:description", content: "Defina a palavra-passe da sua Área de Cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Não foi possível definir a palavra-passe. Peça um novo link.");
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user.user) {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.user.id,
        _role: "admin",
      });
      isAdmin = data === true;
    }
    navigate({ to: isAdmin ? "/admin" : "/documentos", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-24">
      <div className="w-full max-w-md rounded-[2.5rem] bg-card p-10 shadow-[0_24px_70px_-24px_color-mix(in_oklab,var(--ink)_12%,transparent)] ring-1 ring-gold/15 sm:p-12">
        <h1 className="font-serif text-3xl text-foreground">Definir Palavra-passe</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Escolha uma palavra-passe para aceder à sua Área de Cliente.
        </p>

        {!ready ? (
          <p className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3 text-sm text-foreground">
            Abra esta página através da ligação que recebeu por email.
          </p>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="pw" className="mb-2 block text-xs font-medium text-foreground/80">
              Nova palavra-passe
            </label>
            <input
              id="pw"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
            />
          </div>
          <div>
            <label htmlFor="pw2" className="mb-2 block text-xs font-medium text-foreground/80">
              Confirmar palavra-passe
            </label>
            <input
              id="pw2"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !ready}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-medium text-ink transition-all hover:bg-gold-deep disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar e entrar
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground/80">
          <Link to="/login" className="text-gold underline underline-offset-2">
            Voltar ao início de sessão
          </Link>
        </p>
      </div>
    </main>
  );
}
