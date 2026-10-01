import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { whatsappUrl, WhatsAppIcon } from "@/lib/whatsapp.tsx";

export function Contact() {
  return (
    <Section id="contactos" className="relative bg-ink-soft">
      <div className="relative">
        <SectionHeading overline="Fale connosco" title="Vamos falar sobre o seu negócio" light />
        <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-loose text-cream/65 sm:text-base">
          A forma mais rápida é pelo WhatsApp — respondemos o mais brevemente possível, em horário útil.
        </p>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[2rem] bg-gold p-8 text-ink transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-18px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink/10">
                <WhatsAppIcon className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-ink/10 px-3 py-1 text-[0.65rem] tracking-wider-caps">
                Recomendado
              </span>
            </div>
            <h3 className="mt-7 font-serif text-2xl">WhatsApp</h3>
            <p className="mt-1.5 text-sm text-ink/70">Fale diretamente connosco </p>
            <span className="mt-6 inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-gold transition-transform duration-300 group-hover:translate-x-1">
              965 378 291
            </span>
          </a>

          <a
            href="tel:+351965378291"
            className="soft-card-dark group p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/45"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
              <Phone className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <h3 className="mt-7 font-serif text-2xl text-cream">Chamada</h3>
            <p className="mt-1.5 text-sm text-cream/55">Segunda a sexta, em horário de expediente</p>
            <span className="mt-6 inline-flex items-center rounded-full bg-gold/10 px-5 py-2.5 text-sm font-medium text-gold transition-transform duration-300 group-hover:translate-x-1">
              965 378 291
            </span>
          </a>

          <a
            href="mailto:geral@as-contabilidade.pt"
            className="soft-card-dark group p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/45"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
              <Mail className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <h3 className="mt-7 font-serif text-2xl text-cream">Email</h3>
            <p className="mt-1.5 text-sm text-cream/55">Para pedidos mais detalhados</p>
            <span className="mt-6 inline-flex max-w-full items-center truncate rounded-full bg-gold/10 px-5 py-2.5 text-sm font-medium text-gold transition-transform duration-300 group-hover:translate-x-1">
              geral@as-contabilidade.pt
            </span>
          </a>

          <a
            href="https://www.google.com/maps/search/?api=1&query=Av.+Jos%C3%A9+Gon%C3%A7alves+Pais%2C+21%2C+3515-146+Viseu"
            target="_blank"
            rel="noopener noreferrer"
            className="soft-card-dark group p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/45"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
              <MapPin className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <h3 className="mt-7 font-serif text-2xl text-cream">Localização</h3>
            <p className="mt-1.5 text-sm text-cream/55">Visite-nos no nosso gabinete</p>
            <span className="mt-6 inline-flex max-w-full items-center rounded-full bg-gold/10 px-5 py-2.5 text-sm font-medium text-gold transition-transform duration-300 group-hover:translate-x-1">
              Viseu, Portugal
            </span>
          </a>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 text-sm text-cream/55 sm:flex-row sm:gap-10">
          <span className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-gold" strokeWidth={1.5} />
            8h30 — 12h30 | 14h00 — 18h00
          </span>
        </div>
      </div>
    </Section>
  );
}
