import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Phone, Mail, MapPin } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { GoldButton } from "./GoldButton";
import { contactSchema, submitContactMessage } from "@/lib/contact.functions";
import contactImage from "@/assets/contact-office.jpg";

const inputClass =
  "w-full rounded-2xl border border-gold/25 bg-ink/40 px-5 py-3.5 text-sm text-cream placeholder:text-cream/35 transition-colors focus:border-gold/70 focus:outline-none";

const infos = [
  {
    icon: Clock,
    label: "Horário",
    value: "8h30 — 12h30 | 14h00 — 18h00",
  },
  {
    icon: Phone,
    label: "Telefone",
    value: "965 378 291",
    href: "tel:+351965378291",
  },
  {
    icon: Mail,
    label: "Email",
    value: "geral@as-contabilidade.pt",
    href: "mailto:geral@as-contabilidade.pt",
  },
  {
    icon: MapPin,
    label: "Morada",
    value: "Av. José Gonçalves Pais, nº21, 3515-146 Viseu",
  },
];

export function Contact() {
  const submit = useServerFn(submitContactMessage);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const parsed = contactSchema.safeParse({
      firstName: String(fd.get("firstName") ?? ""),
      lastName: String(fd.get("lastName") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Verifique os dados introduzidos.");
      setState("error");
      return;
    }

    setError(null);
    setState("sending");
    try {
      const result = await submit({ data: parsed.data });
      if (result.ok) {
        setState("sent");
        form.reset();
      } else {
        setError("Não foi possível enviar a mensagem. Tente novamente.");
        setState("error");
      }
    } catch {
      setError("Não foi possível enviar a mensagem. Tente novamente.");
      setState("error");
    }
  }

  return (
    <Section id="contactos" className="relative bg-ink-soft">
      <div className="relative">
        <SectionHeading overline="Fale connosco" title="Contactos" />

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="relative overflow-hidden rounded-[2rem]">
              <img
                src={contactImage}
                alt="Sala de espera do escritório ao entardecer, com poltronas creme e vista sobre a cidade"
                width={1280}
                height={960}
                loading="lazy"
                className="h-56 w-full object-cover sm:h-64"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
              <p className="absolute bottom-5 left-6 max-w-xs font-serif text-lg leading-snug text-cream">
                Estamos em Viseu, de portas abertas para si.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {infos.map(({ icon: Icon, label, value, href }) => (
                <div
                  key={label}
                  className="soft-card flex items-start gap-4 p-6 transition-colors hover:border-gold/40"
                >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gold">{label}</p>
                  {href ? (
                    <a
                      href={href}
                      className="mt-1.5 block text-sm text-cream/75 transition-colors hover:text-gold"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="mt-1.5 text-sm leading-relaxed text-cream/75">{value}</p>
                  )}
                </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="soft-card rounded-[2rem] p-7 sm:p-9"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-xs text-cream/60"
                >
                  Nome
                </label>
                <input id="firstName" name="firstName" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-2 block text-xs text-cream/60">
                  Último Nome
                </label>
                <input id="lastName" name="lastName" required className={inputClass} />
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="email" className="mb-2 block text-xs text-cream/60">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
              />
            </div>

            <div className="mt-5">
              <label htmlFor="message" className="mb-2 block text-xs text-cream/60">
                Mensagem
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <GoldButton type="submit" disabled={state === "sending"}>
                {state === "sending" ? "A enviar…" : "Enviar mensagem"}
              </GoldButton>
              {state === "sent" ? (
                <p className="text-xs text-cream/70">
                  Mensagem enviada. Entraremos em contacto brevemente.
                </p>
              ) : null}
              {state === "error" && error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </Section>
  );
}
