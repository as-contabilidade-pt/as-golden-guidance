import { Logo } from "./Logo";

const legais = [
  { label: "Termos e Condições", href: "#" },
  { label: "Política de Privacidade", href: "#" },
  { label: "Livro de Reclamações", href: "https://www.livroreclamacoes.pt/inicio" },
  {
    label: "Resolução Alternativa de Litígios",
    href: "https://www.consumidor.gov.pt/parceiros/sistema-de-defesa-do-consumidor/entidades-de-resolucao-alternativa-de-litigios-de-consumo.aspx",
  },
];

const uteis = [
  { label: "Portal das Finanças", href: "https://www.portaldasfinancas.gov.pt" },
  { label: "Ordem dos Contabilistas Certificados", href: "https://www.occ.pt" },
  { label: "ePortugal", href: "https://eportugal.gov.pt" },
  { label: "Segurança Social Direta", href: "https://www.seg-social.pt/inicio" },
];

export function Footer() {
  return (
    <footer className="border-t border-gold/25 bg-ink px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <Logo size={48} />
            <p className="mt-5 font-serif text-lg text-cream">
              AS — Contabilidade, Fiscalidade e Gestão
            </p>
            <p className="mt-3 text-xs leading-relaxed text-cream/55">
              Av. José Gonçalves Pais, nº21, 3515-146 Viseu
              <br />
              965 378 291 · geral@as-contabilidade.pt
            </p>
          </div>

          <div>
            <p className="text-[0.6rem] tracking-wider-caps text-gold">Informação legal</p>
            <ul className="mt-5 space-y-3">
              {legais.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-xs text-cream/60 transition-colors hover:text-gold"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[0.6rem] tracking-wider-caps text-gold">Links úteis</p>
            <ul className="mt-5 space-y-3">
              {uteis.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cream/60 transition-colors hover:text-gold"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="gold-rule mt-14" />
        <p className="mt-8 text-center text-[0.65rem] tracking-wider-caps text-cream/40">
          © 2026 AS — Contabilidade, Fiscalidade e Gestão
        </p>
      </div>
    </footer>
  );
}
