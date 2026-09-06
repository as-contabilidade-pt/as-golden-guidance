import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Indique o seu nome").max(80),
  lastName: z.string().trim().min(1, "Indique o seu último nome").max(80),
  email: z.string().trim().email("Endereço de email inválido").max(255),
  message: z.string().trim().min(5, "Escreva a sua mensagem").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error } = await supabase.from("contact_messages").insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      message: data.message,
    });

    if (error) {
      console.error("contact insert failed", error.message);
      return { ok: false as const };
    }

    return { ok: true as const };
  });
