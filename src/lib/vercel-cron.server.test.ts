import { describe, expect, test } from "bun:test";
import { authenticateVercelCron, isMonthlySubmissionTime } from "./vercel-cron.server";

describe("Vercel cron authentication", () => {
  // These are isolated test fixtures, not deployment credentials.
  const fixture = "test-only-cron-fixture";
  test("fails closed when configuration is absent", async () => {
    expect((await authenticateVercelCron(new Request("https://example.test"), undefined))?.status).toBe(503);
  });
  test("rejects missing, malformed and incorrect authorization", async () => {
    for (const authorization of ["", "Basic test", "Bearer incorrect", "Bearer test token"]) {
      const request = new Request("https://example.test", { headers: { authorization } });
      expect((await authenticateVercelCron(request, fixture))?.status).toBe(401);
    }
  });
  test("accepts the correct bearer credential", async () => {
    const request = new Request("https://example.test", { headers: { authorization: `Bearer ${fixture}` } });
    expect(await authenticateVercelCron(request, fixture)).toBeNull();
  });
});

describe("monthly submission uses Lisbon time", () => {
  test("summer and winter both run on day 10 at 09:00", () => {
    expect(isMonthlySubmissionTime(new Date("2026-10-10T08:00:00Z"))).toBe(true);
    expect(isMonthlySubmissionTime(new Date("2026-12-10T09:00:00Z"))).toBe(true);
  });
  test("skips the other UTC hour and every other day", () => {
    for (const date of ["2026-10-10T09:00:00Z", "2026-12-10T08:00:00Z", "2026-10-09T08:00:00Z", "2026-10-11T08:00:00Z"]) {
      expect(isMonthlySubmissionTime(new Date(date))).toBe(false);
    }
  });
});