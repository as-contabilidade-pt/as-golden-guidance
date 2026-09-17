import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const links = [
  { href: "/#sobre-nos", label: "Sobre Nós" },
  { href: "/#principios", label: "Princípios" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#contactos", label: "Contactos" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full px-5 py-3 transition-all duration-500 ${
          scrolled
            ? "border border-gold/25 bg-cream/90 backdrop-blur-xl shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--ink)_12%,transparent)]"
            : "border border-transparent bg-transparent"
        }`}
      >
        <a href="/#inicio" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Logo size={34} />
          <span
            className={`min-w-0 truncate font-serif text-sm transition-colors sm:text-base ${
              scrolled ? "text-ink" : "text-cream"
            }`}
          >
            AS
            <span className="ml-2 font-sans text-[0.7rem] text-gold sm:text-xs">Contabilidade</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm transition-colors hover:text-gold ${
                scrolled ? "text-ink/70" : "text-cream/80"
              }`}
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/login"
            className="rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-ink transition-all hover:bg-gold-deep"
          >
            Área de Cliente
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="shrink-0 rounded-full bg-gold/10 p-2.5 text-gold lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="mx-auto mt-3 max-w-6xl rounded-[2rem] border border-gold/25 bg-cream/97 px-6 py-6 shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--ink)_12%,transparent)] backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink/80"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-gold px-6 py-3 text-center text-sm font-medium text-ink"
            >
              Área de Cliente
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
