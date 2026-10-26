import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const writes: { operation: string; payload: Record<string, unknown> }[] = [];
let reopening = false;
let existingSubmission = false;

const database = {
  from(table: string) {
    const query = {
      select: () => query,
      eq: () => query,
      not: () => query,
      limit: () => query,
      maybeSingle: () => query,
      insert(payload: Record<string, unknown>) {
        if (table === "month_submissions") writes.push({ operation: "insert", payload });
        return query;
      },
      update(payload: Record<string, unknown>) {
        if (table === "month_submissions") writes.push({ operation: "update", payload });
        return query;
      },
      then(resolve: (value: unknown) => unknown) {
        const client = { user_id: "fixture-client", name: "Fixture", nif: "123456789", email: null, responsible_name: "Fixture" };
        const data = table === "client_records" ? (reopening ? client : [client])
          : table === "unlock_requests" ? [{ id: "fixture-request", user_id: "fixture-client", year: 2026, month: 9, decided_at: "2026-10-12T09:00:00Z" }]
          : table === "month_submissions" && existingSubmission ? [{ id: "fixture-submission" }]
          : [];
        return Promise.resolve({ data, count: table === "documents" ? 2 : null, error: null }).then(resolve);
      },
    };
    return query;
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: database }));
const { autoSubmitPendingMonths, autoSubmitExpiredUnlocks } = await import("./submission-email.server");

beforeEach(() => { writes.length = 0; reopening = false; existingSubmission = false; });
afterEach(() => { writes.length = 0; });

describe("automatic submission records", () => {
  test("never submits on day 10, including through the preserved POST callback", async () => {
    await autoSubmitPendingMonths(new Date("2026-10-10T09:00:00Z"));
    expect(writes).toHaveLength(0);
  });

  test("records day 10 at 23:59:59 Lisbon in summer and winter, including January rollover", async () => {
    for (const [now, deadline, year, month] of [
      ["2026-10-11T08:00:00Z", "2026-10-10T22:59:59.000Z", 2026, 9],
      ["2026-12-11T08:00:00Z", "2026-12-10T23:59:59.000Z", 2026, 11],
      ["2027-01-11T08:00:00Z", "2027-01-10T23:59:59.000Z", 2026, 12],
    ] as const) {
      writes.length = 0;
      await autoSubmitPendingMonths(new Date(now));
      expect(writes).toHaveLength(1);
      expect(writes[0]?.payload.submitted_at).toBe(deadline);
      expect(writes[0]?.payload.year).toBe(year);
      expect(writes[0]?.payload.month).toBe(month);
    }
  });

  test("monthly automation never records client acceptance", async () => {
    await autoSubmitPendingMonths(new Date("2026-10-11T08:00:00Z"));
    expect(writes).toHaveLength(1);
    expect(writes[0]?.payload.declaration_accepted).toBe(false);
  });

  test("expired reopenings retain their deadline and never record client acceptance on insert or update", async () => {
    reopening = true;
    for (const exists of [false, true]) {
      existingSubmission = exists;
      writes.length = 0;
      await autoSubmitExpiredUnlocks(new Date("2026-10-16T09:00:00Z"));
      expect(writes).toHaveLength(1);
      expect(writes[0]?.operation).toBe(exists ? "update" : "insert");
      expect(writes[0]?.payload.submitted_at).toBe("2026-10-15T09:00:00.000Z");
      expect(writes[0]?.payload.declaration_accepted).toBe(false);
    }
  });
});