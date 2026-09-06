import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";

const title = "Área de Cliente | AS Contabilidade, Fiscalidade e Gestão";
const description =
  "Área reservada aos clientes da AS — Contabilidade, Fiscalidade e Gestão. Acesso disponível em breve.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const inputClass =
  "w-full rounded-2xl border border-gold/25 bg-ink/40 px-5 py-3.5 text-sm text-cream/60 placeholder:text-cream/30 focus:outline-none";

function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink px-6 py-24">
      <div className="relative w-full max-w-md rounded-[2.5rem] border border-gold/20 bg-ink-soft/70 px-8 py-12">
        <div className="flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-8 font-serif text-3xl text-cream">Área de Cliente</h1>
          <p className="mt-4 text-sm leading-relaxed text-cream/60">
            O acesso reservado a clientes, com envio de documentos e consulta de
            informação, estará disponível em breve.
          </p>
        </div>

        <form className="mt-10 space-y-5" aria-disabled>
          <div>
            <label htmlFor="email" className="mb-2 block text-xs text-cream/50">
              Email
            </label>
            <input id="email" type="email" disabled className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-xs text-cream/50">
              Palavra-passe
            </label>
            <input id="password" type="password" disabled className={inputClass} />
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-full border border-gold/40 px-8 py-3.5 text-sm text-gold/50"
          >
            Entrar — Em breve
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="text-sm text-cream/50 transition-colors hover:text-gold"
          >
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

