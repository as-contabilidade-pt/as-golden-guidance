import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo, Corner } from "@/components/site/Logo";

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
  "w-full border border-gold/25 bg-transparent px-4 py-3 text-sm text-cream/60 placeholder:text-cream/30 focus:outline-none";

function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink px-6 py-24">
      <div className="deco-pattern absolute inset-0 opacity-35" aria-hidden />

      <div className="relative w-full max-w-md border border-gold/25 bg-ink-soft/70 px-8 py-12">
        <Corner className="absolute left-2 top-2" />
        <Corner className="absolute right-2 top-2 rotate-90" />
        <Corner className="absolute bottom-2 right-2 rotate-180" />
        <Corner className="absolute bottom-2 left-2 -rotate-90" />

        <div className="flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-8 font-serif text-3xl text-cream">Área de Cliente</h1>
          <div className="gold-rule mt-5 w-20" />
          <p className="mt-5 text-xs leading-relaxed text-cream/60">
            O acesso reservado a clientes, com envio de documentos e consulta de
            informação, estará disponível em breve.
          </p>
        </div>

        <form className="mt-10 space-y-5" aria-disabled>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-[0.6rem] tracking-wider-caps text-cream/50"
            >
              Email
            </label>
            <input id="email" type="email" disabled className={inputClass} />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-[0.6rem] tracking-wider-caps text-cream/50"
            >
              Palavra-passe
            </label>
            <input id="password" type="password" disabled className={inputClass} />
          </div>
          <button
            type="button"
            disabled
            className="w-full border border-gold/40 px-8 py-3 text-[0.68rem] tracking-wider-caps text-gold/50"
          >
            Entrar — Em breve
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="text-[0.62rem] tracking-wider-caps text-cream/50 transition-colors hover:text-gold"
          >
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
