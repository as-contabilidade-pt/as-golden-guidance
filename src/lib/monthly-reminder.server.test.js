import { afterEach, beforeEach, expect, mock, setSystemTime, test } from "bun:test";

let clients = [];
let submissions = [];
let reads = [];
let deliveries = [];
let responseStatus = 200;
const originalKey = process.env.RESEND_API_KEY;
const originalFetch = globalThis.fetch;

const database = {
  from(table) {
    const filters = [];
    const query = {
      select: () => query,
      eq: (key, value) => { filters.push([key, value]); return query; },
      not: (key) => { filters.push([key, "not-null"]); return query; },
      limit: () => query,
      delete: () => query,
      lt: () => query,
      then(resolve) {
        reads.push({ table, filters });
        let data = table === "client_records" ? clients : table === "month_submissions" ? submissions : [];
        data = data.filter((row) => filters.every(([key, value]) => value === "not-null" ? row[key] != null : row[key] === value));
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return query;
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: database }));
const { sendMonthlyReminders } = await import("./submission-email.server");
const { Route } = await import("../routes/api/public/jobs/vercel");
const originalCronSecret = process.env.CRON_SECRET;

beforeEach(() => {
  clients = [{ id: "client-1", user_id: "user-1", email: "fixture@example.test", folder_active: true }];
  submissions = []; reads = []; deliveries = []; responseStatus = 200;
  setSystemTime(new Date("2026-10-06T08:00:00Z"));
  process.env.RESEND_API_KEY = "test-only-fixture";
  globalThis.fetch = mock(async (_url, options) => {
    deliveries.push({ headers: options.headers, body: JSON.parse(options.body) });
    return new Response("", { status: responseStatus });
  });
});

afterEach(() => {
  setSystemTime(); globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = originalCronSecret;
});

test("only active linked clients with a valid email receive reminders", async () => {
  clients.push(
    { id: "inactive", user_id: "user-2", email: "inactive@example.test", folder_active: false },
    { id: "unlinked", user_id: null, email: "unlinked@example.test", folder_active: true },
    { id: "invalid", user_id: "user-3", email: "invalid@", folder_active: true },
  );
  expect(await sendMonthlyReminders("2026-10")).toEqual({ sent: 1, failed: 0 });
  expect(deliveries[0].body.to).toEqual(["fixture@example.test"]);
  expect(deliveries[0].headers["Idempotency-Key"]).toBe("lembrete-2026-10-client-1");
});

test("a previous-month submission excludes the client, but other months do not", async () => {
  submissions = [{ id: "submission", user_id: "user-1", year: 2026, month: 9 }];
  expect(await sendMonthlyReminders("2026-10")).toEqual({ sent: 0, failed: 0 });
  submissions[0].month = 8;
  expect(await sendMonthlyReminders("2026-10")).toEqual({ sent: 1, failed: 0 });
});

test("January checks December of the preceding year", async () => {
  setSystemTime(new Date("2027-01-06T08:00:00Z"));
  submissions = [{ id: "submission", user_id: "user-1", year: 2026, month: 12 }];
  expect(await sendMonthlyReminders("2027-01")).toEqual({ sent: 0, failed: 0 });
  expect(reads.find((r) => r.table === "month_submissions").filters).toContainEqual(["year", 2026]);
});

test("previous month follows Lisbon at the summer month boundary", async () => {
  setSystemTime(new Date("2026-08-31T23:30:00Z"));
  submissions = [{ id: "submission", user_id: "user-1", year: 2026, month: 8 }];
  expect(await sendMonthlyReminders()).toEqual({ sent: 0, failed: 0 });
});

test("reminder failures never log recipient details", async () => {
  const log = mock(() => {});
  const originalLog = console.log; const originalError = console.error;
  console.log = log; console.error = log;
  try {
    responseStatus = 422;
    expect(await sendMonthlyReminders()).toEqual({ sent: 0, failed: 1 });
    delete process.env.RESEND_API_KEY;
    expect(await sendMonthlyReminders()).toEqual({ sent: 0, failed: 1 });
    expect(log).not.toHaveBeenCalled();
  } finally { console.log = originalLog; console.error = originalError; }
});

test("daily callback sends on Lisbon day 6 and not day 8", async () => {
  process.env.CRON_SECRET = "test-only-cron-fixture";
  const originalLog = console.log; console.log = () => {};
  try {
    for (const [date, count] of [["2026-10-06T08:00:00Z", 1], ["2026-10-08T08:00:00Z", 0], ["2026-10-05T23:30:00Z", 1], ["2026-12-05T23:30:00Z", 0]]) {
      setSystemTime(new Date(date)); deliveries = [];
      const response = await Route.options.server.handlers.GET({ request: new Request("https://example.test/api/public/jobs/vercel", { headers: { authorization: "Bearer test-only-cron-fixture" } }) });
      expect(response.status).toBe(200);
      expect(deliveries).toHaveLength(count);
    }
  } finally { console.log = originalLog; }
});