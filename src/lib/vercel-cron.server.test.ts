import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { authenticateVercelCron, isMonthlySubmissionTime } from "./vercel-cron.server";

describe("Vercel cron authentication", () => {
  // These are isolated test fixtures, not deployment credentials.
  const fixture = "test-only-cron-fixture";
  test("fails closed when configuration is absent", async () => {
    for (const authorization of ["", `Bearer ${fixture}`]) {
      const request = new Request("https://example.test", { headers: { authorization } });
      const response = await authenticateVercelCron(request, undefined);
      assert.equal(response?.status, 401);
      assert.equal(response?.headers.get("Cache-Control"), "no-store");
    }
  });
  test("rejects missing, malformed and incorrect authorization", async () => {
    for (const authorization of ["", "Basic test", "Bearer incorrect", "Bearer test token"]) {
      const request = new Request("https://example.test", { headers: { authorization } });
      assert.equal((await authenticateVercelCron(request, fixture))?.status, 401);
    }
  });
  test("accepts the correct bearer credential", async () => {
    const request = new Request("https://example.test", { headers: { authorization: `Bearer ${fixture}` } });
    assert.equal(await authenticateVercelCron(request, fixture), null);
  });
});

describe("monthly submission uses Lisbon day", () => {
  test("daily run on day 10 in summer and winter", () => {
    assert.equal(isMonthlySubmissionTime(new Date("2026-10-10T08:00:00Z")), true);
    assert.equal(isMonthlySubmissionTime(new Date("2026-12-10T08:59:00Z")), true);
  });
  test("skips every other day", () => {
    for (const date of ["2026-10-09T08:00:00Z", "2026-10-11T08:00:00Z", "2026-10-10T23:30:00Z"]) {
      assert.equal(isMonthlySubmissionTime(new Date(date)), false);
    }
  });
});