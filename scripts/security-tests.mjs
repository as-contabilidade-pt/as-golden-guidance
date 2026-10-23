// Testes de segurança repetíveis. Correr no computador local:
//   cp .env.test.example .env.test   (preencher)
//   node scripts/security-tests.mjs
// Usa apenas a chave pública (anon) e contas de TESTE. Tudo o que é criado tem o
// prefixo "__teste__" e é apagado no fim. Código de saída ≠ 0 se algum teste falhar.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Falta a variável ${k} em .env.test`); process.exit(2); }
  return v;
};
const URL = need("SUPABASE_URL");
const KEY = need("SUPABASE_ANON_KEY");
if (KEY.includes("service_role")) { console.error("Não usar a service_role."); process.exit(2); }

const BUCKET = "documentos";
const CAT = "outros_documentos";
const PREFIX = "__teste__";
const results = [];
const cleanup = []; // { c, kind: "doc"|"file", id|path }

const rec = (n, name, pass, detail = "") =>
  results.push({ n, teste: name, resultado: pass === null ? "SKIP" : pass ? "PASS" : "FAIL", detalhe: String(detail ?? "").slice(0, 90) });

const newClient = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function signIn(email, password) {
  const c = newClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login falhou para ${email}: ${error.message}`);
  return { c, id: data.user.id, token: data.session.access_token };
}

const pdf = (size = 400) => {
  const head = "%PDF-1.4\n% " + PREFIX + "\n";
  return new Blob([head + " ".repeat(Math.max(0, size - head.length)) + "\n%%EOF"], { type: "application/pdf" });
};
const pad = (m) => String(m).padStart(2, "0");

// Mês aberto = mês corrente; bloqueado por data = há 3 meses; futuro = próximo mês.
const now = new Date();
const ym = (offset) => {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};
const OPEN = ym(0), LOCKED = ym(-3), FUTURE = ym(1);

async function insertDoc(u, target, m, extra = {}) {
  const label = `${PREFIX}${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  const row = {
    user_id: target, year: m.year, month: m.month, category: CAT, seq: 900 + Math.floor(Math.random() * 99),
    label, original_name: `${label}.pdf`, storage_path: `${target}/${m.year}/${pad(m.month)}/${CAT}/${label}.pdf`, ...extra,
  };
  const r = await u.c.from("documents").insert(row).select("*").single();
  if (r.data) cleanup.push({ c: u.c, kind: "doc", id: r.data.id });
  return r;
}
async function upload(u, path, blob = pdf()) {
  const r = await u.c.storage.from(BUCKET).upload(path, blob, { upsert: false, contentType: blob.type });
  if (!r.error) cleanup.push({ c: u.c, kind: "file", path });
  return r;
}

async function safe(n, name, fn) {
  try { await fn(); } catch (e) { rec(n, name, false, "exceção: " + e.message); }
}

async function main() {
  const anon = newClient();
  const A = await signIn(need("TEST_A_EMAIL"), need("TEST_A_PASSWORD"));
  const B = await signIn(need("TEST_B_EMAIL"), need("TEST_B_PASSWORD"));
  const C = process.env.TEST_C_EMAIL && process.env.TEST_C_PASSWORD
    ? await signIn(process.env.TEST_C_EMAIL, process.env.TEST_C_PASSWORD) : null;

  // Prepara um ficheiro do B para testar acesso cruzado.
  const bPath = `${B.id}/${OPEN.year}/${pad(OPEN.month)}/${CAT}/${PREFIX}b.pdf`;
  await upload(B, bPath);

  // ---------- Isolamento ----------
  await safe(1, "A só vê os seus dados", async () => {
    const issues = [];
    for (const [t, col] of [["documents", "user_id"], ["profiles", "id"], ["client_records", "user_id"], ["month_submissions", "user_id"], ["unlock_requests", "user_id"]]) {
      const all = await A.c.from(t).select(col).limit(500);
      if ((all.data ?? []).some((r) => r[col] && r[col] !== A.id)) issues.push(`${t}: vê alheios`);
      const b = await A.c.from(t).select(col).eq(col, B.id);
      if ((b.data ?? []).length) issues.push(`${t}: filtro B=${b.data.length}`);
    }
    rec(1, "A só vê os seus dados (5 tabelas)", issues.length === 0, issues.join("; "));
  });
  await safe(2, "A insere documento do B", async () => {
    const r = await insertDoc(A, B.id, OPEN);
    rec(2, "A não insere documento em nome do B", !!r.error, r.error?.message);
  });
  await safe(3, "A descarrega ficheiro do B", async () => {
    const d = await A.c.storage.from(BUCKET).download(bPath);
    const s = await A.c.storage.from(BUCKET).createSignedUrl(bPath, 60);
    rec(3, "A não descarrega nem assina URL do B", !!d.error && !!s.error, `${d.error?.message ?? "download OK"} / ${s.error?.message ?? "URL OK"}`);
  });
  await safe(4, "A lista pasta do B", async () => {
    const r = await A.c.storage.from(BUCKET).list(B.id, { limit: 5 });
    rec(4, "A não lista a pasta do B", !!r.error || (r.data ?? []).length === 0, `${r.data?.length ?? 0} itens`);
  });

  // ---------- Privilégios ----------
  await safe(5, "user_roles", async () => {
    const r = await A.c.from("user_roles").insert({ user_id: A.id, role: "admin" });
    rec(5, "A não se torna admin", !!r.error, r.error?.message);
  });
  await safe(6, "perfil", async () => {
    const before = await A.c.from("profiles").select("nif, email, full_name").eq("id", A.id).maybeSingle();
    const r = await A.c.from("profiles").update({ nif: "999999990", email: `${PREFIX}@x.pt`, full_name: `${PREFIX}hack` }).eq("id", A.id).select("nif, email, full_name");
    const after = await A.c.from("profiles").select("nif, email, full_name").eq("id", A.id).maybeSingle();
    const unchanged = JSON.stringify(before.data) === JSON.stringify(after.data);
    rec(6, "A não altera nif/email/nome do perfil", !!r.error || unchanged, r.error?.message ?? (unchanged ? "sem alteração" : "ALTEROU"));
    if (!unchanged && before.data) await A.c.from("profiles").update(before.data).eq("id", A.id);
  });
  await safe(7, "anónimo", async () => {
    const leaks = [];
    for (const t of ["documents", "profiles", "client_records", "month_submissions", "unlock_requests", "user_roles", "statement_conversions", "contact_messages", "audit_log"]) {
      const r = await anon.from(t).select("*").limit(1);
      if (!r.error && (r.data ?? []).length) leaks.push(t);
    }
    const ok = await anon.from("contact_messages").insert({ name: `${PREFIX}anon`, email: "teste@exemplo.pt", phone: "", subject: PREFIX, message: "Mensagem de teste automática." });
    const big = await anon.from("contact_messages").insert({ name: `${PREFIX}anon`, email: "teste@exemplo.pt", phone: "", subject: PREFIX, message: "x".repeat(20000) });
    rec(7, "Anónimo não lê dados; contacto normal OK e gigante recusado", !leaks.length && !ok.error && !!big.error,
      `fugas:[${leaks}] normal:${ok.error?.message ?? "OK"} gigante:${big.error ? "recusada" : "ACEITE"}`);
  });
  await safe(8, "signUp", async () => {
    const r = await newClient().auth.signUp({ email: `${PREFIX}${Date.now()}@exemplo.pt`, password: "Teste12345!x" });
    rec(8, "Registo público está desligado", !!r.error || !r.data?.user, r.error?.message ?? "CONTA CRIADA");
  });
  await safe(9, "rotas admin", async () => {
    const urls = (process.env.ADMIN_FN_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!urls.length) return rec(9, "Rotas de admin recusam cliente", null, "ADMIN_FN_URLS vazio — ver SECURITY_TESTS.md");
    const bad = [];
    for (const u of urls) {
      const res = await fetch(u, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${A.token}` }, body: JSON.stringify({ data: {} }) });
      const body = await res.text();
      if (res.ok && !/admin|autoriz|permiss/i.test(body)) bad.push(`${res.status} ${u}`);
    }
    rec(9, "Rotas de admin recusam cliente", !bad.length, bad.join("; "));
  });
  await safe(10, "audit_log", async () => {
    const r = await A.c.from("audit_log").select("*").limit(1);
    const w = await A.c.from("audit_log").insert({ table_name: PREFIX, action: "INSERT" });
    rec(10, "A não lê nem escreve audit_log", (!!r.error || !(r.data ?? []).length) && !!w.error, `ler:${r.data?.length ?? r.error?.message} escrever:${w.error ? "recusado" : "ACEITE"}`);
  });

  // ---------- Regras de mês ----------
  let openDoc = null;
  await safe(11, "envio mês aberto", async () => {
    const r = await insertDoc(A, A.id, OPEN);
    openDoc = r.data;
    const up = r.data ? await upload(A, r.data.storage_path) : { error: { message: "sem registo" } };
    rec(11, "A envia PDF para o mês aberto", !r.error && !up.error, r.error?.message ?? up.error?.message ?? `label ${r.data?.label}`);
  });
  await safe(12, "mês bloqueado", async () => {
    const r = await insertDoc(A, A.id, LOCKED);
    const up = await upload(A, `${A.id}/${LOCKED.year}/${pad(LOCKED.month)}/${CAT}/${PREFIX}lock.pdf`);
    rec(12, "Mês bloqueado recusa tabela e Storage", !!r.error && !!up.error, `tabela:${r.error ? "recusa" : "ACEITE"} storage:${up.error ? "recusa" : "ACEITE"}`);
  });
  await safe(13, "mês futuro", async () => {
    const r = await insertDoc(A, A.id, FUTURE);
    rec(13, "Mês futuro recusado", !!r.error, r.error?.message);
  });
  await safe(14, "não PDF / >10MB", async () => {
    const txt = await upload(A, `${A.id}/${OPEN.year}/${pad(OPEN.month)}/${CAT}/${PREFIX}x.txt`, new Blob(["ola"], { type: "text/plain" }));
    const big = await upload(A, `${A.id}/${OPEN.year}/${pad(OPEN.month)}/${CAT}/${PREFIX}big.pdf`, pdf(10 * 1024 * 1024 + 2048));
    rec(14, "Não-PDF e PDF >10 MB recusados", !!txt.error && !!big.error, `txt:${txt.error ? "recusa" : "ACEITE"} big:${big.error ? "recusa" : "ACEITE"}`);
  });
  await safe(15, "campos forjados", async () => {
    const r = await insertDoc(A, A.id, OPEN, { late: true, late_submitted_at: "2000-01-01T00:00:00Z", created_at: "2000-01-01T00:00:00Z" });
    if (r.error) return rec(15, "Servidor corrige late/created_at forjados", true, "recusado: " + r.error.message);
    const ok = !String(r.data.created_at).startsWith("2000") && !String(r.data.late_submitted_at ?? "").startsWith("2000");
    rec(15, "Servidor corrige late/created_at forjados", ok, `created_at=${r.data.created_at} late=${r.data.late}`);
  });

  // 16-18: usa um mês aberto isolado? A submissão bloqueia o mês aberto do A; ficará apagada no fim.
  let submitted = false;
  await safe(16, "submeter", async () => {
    const real = await A.c.from("documents").select("id", { count: "exact", head: true }).eq("user_id", A.id).eq("year", OPEN.year).eq("month", OPEN.month);
    const r = await A.c.from("month_submissions").insert({
      user_id: A.id, year: OPEN.year, month: OPEN.month, declaration_accepted: true,
      submitted_at: "2000-01-01T00:00:00Z", document_count: 9999, nif: "999999990", company_name: `${PREFIX}falsa`,
    }).select("*").single();
    if (r.error) return rec(16, "Submissão: data e contagem reais", false, r.error.message);
    submitted = true;
    const ok = !String(r.data.submitted_at).startsWith("2000") && r.data.document_count === (real.count ?? 0);
    rec(16, "Submissão: data e contagem reais", ok, `submitted_at=${r.data.submitted_at} count=${r.data.document_count}/${real.count}`);
    const p = await A.c.from("profiles").select("nif, full_name").eq("id", A.id).maybeSingle();
    rec(17, "Submissão: nif/empresa reais", r.data.nif !== "999999990" && r.data.company_name !== `${PREFIX}falsa`, `nif=${r.data.nif} perfil=${p.data?.nif}`);
  });
  if (!results.some((r) => r.n === 17)) rec(17, "Submissão: nif/empresa reais", false, "submissão falhou");
  await safe(18, "após submissão", async () => {
    if (!submitted) return rec(18, "Mês submetido não aceita inserir/apagar", null, "sem submissão");
    const ins = await insertDoc(A, A.id, OPEN);
    let delBlocked = true;
    if (openDoc) {
      const d = await A.c.from("documents").delete().eq("id", openDoc.id).select("id");
      delBlocked = !!d.error || !(d.data ?? []).length;
    }
    rec(18, "Mês submetido não aceita inserir/apagar", !!ins.error && delBlocked, `inserir:${ins.error ? "recusa" : "ACEITE"} apagar:${delBlocked ? "recusa" : "ACEITE"}`);
  });
  await safe(20, "UPDATE/DELETE submissão", async () => {
    const u = await A.c.from("month_submissions").update({ document_count: 1 }).eq("user_id", A.id).select("id");
    const d = await A.c.from("month_submissions").delete().eq("user_id", A.id).select("id");
    rec(20, "A não altera nem apaga submissões", (!!u.error || !(u.data ?? []).length) && (!!d.error || !(d.data ?? []).length), `update:${u.data?.length ?? "erro"} delete:${d.data?.length ?? "erro"}`);
  });
  await safe(19, "apagar documento", async () => {
    // Mês aberto do B (A já submeteu o seu).
    const r = await insertDoc(B, B.id, OPEN);
    const d = r.data ? await B.c.from("documents").delete().eq("id", r.data.id).select("id") : { error: { message: r.error?.message } };
    const okOpen = !d.error && (d.data ?? []).length === 1;
    const old = await B.c.from("documents").select("id").eq("user_id", B.id).eq("year", LOCKED.year).eq("month", LOCKED.month).limit(1);
    let lockedMsg = "sem documento antigo para testar";
    let okLocked = true;
    if ((old.data ?? []).length) {
      const dl = await B.c.from("documents").delete().eq("id", old.data[0].id).select("id");
      okLocked = !!dl.error || !(dl.data ?? []).length;
      lockedMsg = okLocked ? "recusa" : "APAGOU";
    }
    rec(19, "Apagar: aberto OK, bloqueado recusado", okOpen && okLocked, `aberto:${okOpen ? "OK" : d.error?.message} bloqueado:${lockedMsg}`);
  });
  await safe(21, "unlock_requests", async () => {
    const r = await A.c.from("unlock_requests").insert({ user_id: A.id, nif: "999999990", year: 2020, month: 1, reason: PREFIX, declaration_accepted: true, status: "aprovado" }).select("id, status, nif").single();
    if (r.data) await A.c.from("unlock_requests").delete().eq("id", r.data.id);
    const ok = !!r.error || (r.data.status === "pendente" && r.data.nif !== "999999990");
    rec(21, "Desbloqueio nasce pendente e com nif real", ok, r.error?.message ?? `status=${r.data.status} nif=${r.data.nif}`);
  });
  await safe(22, "conta C", async () => {
    if (!C) return rec(22, "Conta inativa não envia nem submete", null, "TEST_C_* em falta");
    const ins = await insertDoc(C, C.id, OPEN);
    const up = await upload(C, `${C.id}/${OPEN.year}/${pad(OPEN.month)}/${CAT}/${PREFIX}c.pdf`);
    const sub = await C.c.from("month_submissions").insert({ user_id: C.id, year: OPEN.year, month: OPEN.month, declaration_accepted: true }).select("id");
    if (sub.data?.length) await C.c.from("month_submissions").delete().eq("id", sub.data[0].id);
    rec(22, "Conta inativa não envia nem submete", !!ins.error && !!up.error && !!sub.error, `doc:${ins.error ? "recusa" : "ACEITE"} storage:${up.error ? "recusa" : "ACEITE"} submeter:${sub.error ? "recusa" : "ACEITE"}`);
  });

  // ---------- Limpeza ----------
  for (const item of cleanup.reverse()) {
    if (item.kind === "doc") await item.c.from("documents").delete().eq("id", item.id);
    else await item.c.storage.from(BUCKET).remove([item.path]);
  }
  await anon.from("contact_messages").delete().like("name", `${PREFIX}%`); // normalmente recusado (só admin)

  results.sort((a, b) => a.n - b.n);
  console.table(results);
  const fails = results.filter((r) => r.resultado === "FAIL").length;
  if (submitted) console.log(`\nAVISO: a submissão de teste de ${pad(OPEN.month)}/${OPEN.year} do cliente A não pode ser apagada pelo cliente — remove-a no painel de admin (desbloquear o mês).`);
  console.log("Nota: mensagens de contacto de teste (nome começa por __teste__) devem ser apagadas pelo admin.");
  console.log(fails ? `\n${fails} teste(s) FALHARAM` : "\nTodos os testes passaram");
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(2); });
