import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Área de Cliente — AS Contabilidade" },
      {
        name: "description",
        content:
          "Área de Cliente da AS — Contabilidade, Fiscalidade e Gestão, em Viseu. Entre para consultar documentos e contactar o seu contabilista.",
      },
    ],
  }),
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    window.alert("A Área de Cliente ainda não está disponível.");
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

        <h1 className="mt-6 font-serif text-3xl text-foreground sm:text-4xl">
          Área de Cliente
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Em breve poderá aceder aos seus documentos e comunicar connosco de forma
          segura.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-medium text-foreground/80">
              Email
            </label>
            <input
              id="email"
              type="email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gold/20 bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-gold py-3.5 text-sm font-medium text-ink transition-all hover:bg-gold-deep"
          >
            Entrar
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground/80">
          Em caso de dúvida, contacte-nos pelo{" "}
          <a href="tel:+351965378291" className="text-gold underline underline-offset-2">
            965 378 291
          </a>{" "}
          ou{" "}
          <a href="mailto:geral@as-contabilidade.pt" className="text-gold underline underline-offset-2">
            email
          </a>.
        </p>
      </div>
    </main>
  );
}
