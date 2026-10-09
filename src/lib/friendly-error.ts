// Converts any error into a readable PT-PT message. Never shows JSON, code or English.
const FIELD_LABELS: Record<string, string> = {
  reason: "o motivo",
  responsibleName: "o nome do responsável",
  supplier: "o campo de identificação",
  name: "o nome",
  nif: "o NIF",
  email: "o email",
  phone: "o telemóvel",
  postal_code: "o código postal",
  postalCode: "o código postal",
  address: "a morada",
  locality: "a localidade",
  password: "a palavra-passe",
  label: "o nome",
  notes: "as observações",
  clientName: "o nome do cliente",
  number: "o número interno",
  internal_number: "o número interno",
};

const KNOWN: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Email ou palavra-passe incorretos."],
  [/email not confirmed/i, "O email ainda não foi confirmado."],
  [/user already registered|already been registered|already exists/i, "Já existe uma conta com este email."],
  [/duplicate key|unique constraint/i, "Já existe um registo com estes dados."],
  [/password should be|weak password/i, "A palavra-passe não cumpre os requisitos de segurança."],
  [/rate limit|too many requests/i, "Demasiadas tentativas. Aguarde um pouco e tente novamente."],
  [/jwt|session|not authenticated|unauthorized|auth/i, "A sua sessão expirou. Entre novamente."],
  [/permission denied|row-level security|forbidden/i, "Não tem permissão para realizar esta ação."],
  [/failed to fetch|network|load failed|timeout/i, "Sem ligação ao servidor. Verifique a internet e tente novamente."],
  [/invalid email|email.*invalid/i, "O email indicado não é válido."],
  [/payload too large|file size|too large/i, "O ficheiro é demasiado grande."],
];

function looksEnglish(s: string) {
  return /\b(the|is|not|invalid|failed|error|must|required|expected|received|should|cannot|unable|undefined|null|string|number|object)\b/i.test(s)
    && !/[áàâãçéêíóôõúÁÀÂÃÇÉÊÍÓÔÕÚ]|\b(não|é|o|a|de|para)\b/i.test(s);
}

function fieldName(path: unknown): string {
  const p = Array.isArray(path) ? path.map(String) : [String(path ?? "")];
  const key = p[p.length - 1] ?? "";
  return FIELD_LABELS[key] ?? "este campo";
}

function issueMessage(t: Record<string, unknown>): string {
  const code = String(t["code"] ?? "");
  const f = fieldName(t["path"]);
  const min = typeof t["minimum"] === "number" ? t["minimum"] : null;
  const max = typeof t["maximum"] === "number" ? t["maximum"] : null;
  const custom = typeof t["message"] === "string" && !looksEnglish(t["message"]) ? t["message"] : null;
  if (custom) return custom;
  const F = f.charAt(0).toUpperCase() + f.slice(1);
  switch (code) {
    case "too_small":
      return min && min > 1
        ? `${F} está demasiado curto. Escreva pelo menos ${min} caracteres.`
        : `Preencha ${f}.`;
    case "too_big":
      return `${F} está demasiado longo. O máximo é de ${max ?? ""} caracteres.`.replace(" de  ", " ");
    case "invalid_string":
    case "invalid_format":
      return `${F} não tem um formato válido.`;
    case "invalid_type":
      return `Preencha ${f} corretamente.`;
    default:
      return `Verifique ${f} e tente novamente.`;
  }
}

export function friendlyError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error ? err.message
    : typeof err === "string" ? err
    : err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string"
      ? String((err as { message: string }).message)
      : "";
  if (!raw.trim()) return fallback;
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const issues = Array.isArray(parsed) ? parsed : [parsed];
      const msgs = issues
        .filter((i) => i && typeof i === "object")
        .map((i) => issueMessage(i as Record<string, unknown>));
      const unique = Array.from(new Set(msgs));
      return unique.length ? unique.join(" ") : fallback;
    } catch {
      return fallback;
    }
  }
  for (const [re, msg] of KNOWN) if (re.test(trimmed)) return msg;
  if (looksEnglish(trimmed) || /[<>{}`]|Error:|at \w+ \(/.test(trimmed)) return fallback;
  return trimmed;
}
