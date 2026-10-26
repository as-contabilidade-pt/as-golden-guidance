/** Separate credential: never changes authentication of managed POST callbacks. */
export async function authenticateVercelCron(request: Request, secret: string | undefined): Promise<Response | null> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  // An unconfigured deployment must deny access, not report an application outage.
  if (!secret || !match?.[1]) return Response.json({ error: "Acesso não autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const encoder = new TextEncoder();
  const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  const [provided, expected] = await Promise.all([hash(match[1]), hash(secret)]);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= (provided[i] ?? 0) ^ (expected[i] ?? 0);
  return difference === 0 ? null : Response.json({ error: "Acesso não autorizado." }, { status: 401 });
}

/** Daily Hobby schedule: any run on day 11 (Lisbon), after the deadline, processes monthly submissions. */
export function isMonthlySubmissionTime(now: Date): boolean {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", day: "numeric" }).format(now);
  return Number(day) === 11;
}