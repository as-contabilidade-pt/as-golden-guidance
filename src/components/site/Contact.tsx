import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Phone, Mail, MapPin } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { GoldButton } from "./GoldButton";
import { contactSchema, submitContactMessage } from "@/lib/contact.functions";

const inputClass =
  "w-full border border-gold/30 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none";

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
      <div className="deco-pattern absolute inset-0 opacity-25" aria-hidden />
      <div className="relative">
        <SectionHeading overline="Fale connosco" title="Contactos" />

        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-2">
          <ul className="space-y-8">
            <li className="flex gap-4">
              <Clock className="mt-1 h-5 w-5 shrink-0 text-gold" strokeWidth={1} />
              <div>
                <p className="text-[0.62rem] tracking-wider-caps text-gold">Horário</p>
                <p className="mt-2 text-sm text-cream/75">8h30 — 12h30 | 14h00 — 18h00</p>
              </div>
            </li>
            <li className="flex gap-4">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-gold" strokeWidth={1} />
              <div>
                <p className="text-[0.62rem] tracking-wider-caps text-gold">Telefone</p>
                <a
                  href="tel:+351965378291"
                  className="mt-2 block text-sm text-cream/75 hover:text-gold"
                >
                  965 378 291
                </a>
              </div>
            </li>
            <li className="flex gap-4">
              <Mail className="mt-1 h-5 w-5 shrink-0 text-gold" strokeWidth={1} />
              <div>
                <p className="text-[0.62rem] tracking-wider-caps text-gold">Email</p>
                <a
                  href="mailto:geral@as-contabilidade.pt"
                  className="mt-2 block text-sm text-cream/75 hover:text-gold"
                >
                  geral@as-contabilidade.pt
                </a>
              </div>
            </li>
            <li className="flex gap-4">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold" strokeWidth={1} />
              <div>
                <p className="text-[0.62rem] tracking-wider-caps text-gold">Morada</p>
                <p className="mt-2 text-sm text-cream/75">
                  Av. José Gonçalves Pais, nº21
                  <br />
                  3515-146 Viseu
                </p>
              </div>
            </li>
          </ul>

          <form onSubmit={onSubmit} className="border border-gold/25 p-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-[0.6rem] tracking-wider-caps text-cream/60"
                >
                  Nome
                </label>
                <input id="firstName" name="firstName" required className={inputClass} />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-[0.6rem] tracking-wider-caps text-cream/60"
                >
                  Último Nome
                </label>
                <input id="lastName" name="lastName" required className={inputClass} />
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="email"
                className="mb-2 block text-[0.6rem] tracking-wider-caps text-cream/60"
              >
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
              <label
                htmlFor="message"
                className="mb-2 block text-[0.6rem] tracking-wider-caps text-cream/60"
              >
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
