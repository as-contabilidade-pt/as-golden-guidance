/** Separate credential: never changes authentication of managed POST callbacks. */
export async function authenticateVercelCron(request: Request, secret: string | undefined): Promise<Response | null> {
  if (!secret) return Response.json({ error: "Agendamento não configurado." }, { status: 503 });
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match?.[1]) return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  const encoder = new TextEncoder();
  const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  const [provided, expected] = await Promise.all([hash(match[1]), hash(secret)]);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= (provided[i] ?? 0) ^ (expected[i] ?? 0);
  return difference === 0 ? null : Response.json({ error: "Acesso não autorizado." }, { status: 401 });
}

export function isMonthlySubmissionTime(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon", day: "numeric", hour: "numeric", hourCycle: "h23",
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "day")?.value) === 10 &&
    Number(parts.find((part) => part.type === "hour")?.value) === 9;
}