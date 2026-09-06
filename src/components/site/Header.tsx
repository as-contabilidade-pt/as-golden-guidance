import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? "border-b border-gold/25 bg-ink/95 backdrop-blur"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/#inicio" className="flex items-center gap-3">
          <Logo size={40} />
          <span className="hidden font-serif text-base text-cream sm:block">
            AS
            <span className="ml-2 font-sans text-[0.6rem] tracking-wider-caps text-gold">
              Contabilidade
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-9 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[0.68rem] tracking-wider-caps text-cream/80 transition-colors hover:text-gold"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/login"
            className="border border-gold px-6 py-2.5 text-[0.66rem] tracking-wider-caps text-gold transition-colors hover:bg-gold hover:text-ink"
          >
            Área de Cliente
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="text-gold lg:hidden"
        >
          {open ? <Menu className="h-6 w-6 rotate-90" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-gold/20 bg-ink px-6 py-6 lg:hidden">
          <nav className="flex flex-col gap-5">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-[0.7rem] tracking-wider-caps text-cream/85"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-2 border border-gold px-6 py-3 text-center text-[0.68rem] tracking-wider-caps text-gold"
            >
              Área de Cliente
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
