import { whatsappUrl, WhatsAppIcon } from "@/lib/whatsapp";

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar connosco no WhatsApp"
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-0 rounded-full bg-gold p-4 text-ink shadow-[0_12px_36px_-10px_color-mix(in_oklab,var(--gold)_60%,transparent)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-10px_color-mix(in_oklab,var(--gold)_75%,transparent)] sm:bottom-8 sm:right-8"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-gold/40 [animation-duration:2.5s]" />
      <WhatsAppIcon className="h-6 w-6" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 group-hover:ml-2.5 group-hover:max-w-40">
        Fale connosco
      </span>
    </a>
  );
}
