// Testes de segurança (isolamento entre clientes e regras de acesso).
// Uso:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... \
//   CLIENT_A_EMAIL=... CLIENT_A_PASSWORD=... \
//   CLIENT_B_EMAIL=... CLIENT_B_PASSWORD=... \
//   node scripts/security-tests.mjs
// Usa duas contas de cliente de TESTE. Não altera dados reais: todas as escritas devem ser recusadas.
import { createClient } from "@supabase/supabase-js";

const env = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Falta a variável ${k}`); process.exit(2); }
  return v;
};
const URL = env("SUPABASE_URL");
const KEY = env("SUPABASE_ANON_KEY");
const results = [];
const record = (name, pass, detail = "") => results.push({ teste: name, resultado: pass ? "PASS" : "FAIL", detalhe: detail });
const newClient = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(email, password) {
  const c = newClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login falhou para ${email}: ${error.message}`);
  return { c, id: data.user.id };
}

async function main() {
  const anon = newClient();
  const A = await signIn(env("CLIENT_A_EMAIL"), env("CLIENT_A_PASSWORD"));
  const B = await signIn(env("CLIENT_B_EMAIL"), env("CLIENT_B_PASSWORD"));

  // 1. Anónimo não lê dados privados
  for (const t of ["profiles", "documents", "month_submissions", "unlock_requests", "client_records", "user_roles", "contact_messages", "statement_conversions"]) {
    const { data, error } = await anon.from(t).select("*").limit(1);
    record(`Anónimo não lê ${t}`, !!error || (data ?? []).length === 0, error?.message ?? `${data?.length ?? 0} linhas`);
  }

  // 2. Cliente A não vê dados do cliente B
  for (const t of ["documents", "month_submissions", "unlock_requests"]) {
    const { data } = await A.c.from(t).select("user_id").eq("user_id", B.id);
    record(`Cliente A não lê ${t} do B`, (data ?? []).length === 0, `${data?.length ?? 0} linhas`);
  }
  {
    const { data } = await A.c.from("profiles").select("id").eq("id", B.id);
    record("Cliente A não lê perfil do B", (data ?? []).length === 0);
    const { data: cr } = await A.c.from("client_records").select("id").eq("user_id", B.id);
    record("Cliente A não lê ficha do B", (cr ?? []).length === 0);
  }

  // 3. Cliente A não escreve em nome do B
  {
    const { error } = await A.c.from("documents").insert({ user_id: B.id, year: 2020, month: 1, category: "outros_documentos", seq: 999, label: "x", original_name: "x.pdf", storage_path: `${B.id}/x.pdf` });
    record("Cliente A não insere documento do B", !!error, error?.message);
    const { error: e2 } = await A.c.from("month_submissions").insert({ user_id: B.id, year: 2020, month: 1, declaration_accepted: true });
    record("Cliente A não submete mês do B", !!e2, e2?.message);
    const { data: up } = await A.c.from("profiles").update({ full_name: "hack" }).eq("id", B.id).select();
    record("Cliente A não altera perfil do B", (up ?? []).length === 0);
  }

  // 4. Escalada de privilégios
  {
    const { error } = await A.c.from("user_roles").insert({ user_id: A.id, role: "admin" });
    record("Cliente não se torna admin", !!error, error?.message);
    const { error: e2 } = await A.c.from("unlock_requests").insert({ user_id: A.id, nif: "0", year: 2020, month: 1, reason: "t", declaration_accepted: true, status: "aprovado" });
    record("Cliente não auto-aprova desbloqueio", !!e2, e2?.message);
    const { error: e3 } = await A.c.from("month_submissions").insert({ user_id: A.id, year: 2020, month: 1, declaration_accepted: false });
    record("Submissão sem declaração recusada", !!e3, e3?.message);
    const { data: cv } = await A.c.from("statement_conversions").select("id").limit(1);
    record("Cliente não lê conversões de extratos", (cv ?? []).length === 0);
  }

  // 5. Storage: A não lista nem descarrega ficheiros do B
  {
    const { data } = await A.c.storage.from("documentos").list(B.id, { limit: 5 });
    record("Cliente A não lista pasta do B", (data ?? []).length === 0, `${data?.length ?? 0} itens`);
    const { error } = await A.c.storage.from("documentos").upload(`${B.id}/2020/01/teste.pdf`, new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    record("Cliente A não carrega na pasta do B", !!error, error?.message);
    const { error: e2 } = await A.c.storage.from("documentos").upload(`${A.id}/2020/01/teste.txt`, new Blob(["ola"], { type: "text/plain" }));
    record("Ficheiro não-PDF recusado", !!e2, e2?.message);
  }

  console.table(results);
  const fails = results.filter((r) => r.resultado === "FAIL").length;
  console.log(fails ? `\n${fails} teste(s) FALHARAM` : "\nTodos os testes passaram");
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(2); });
