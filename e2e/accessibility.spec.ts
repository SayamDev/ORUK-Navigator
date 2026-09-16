import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const staticJourneys = [
  ["home", "/"],
  ["about", "/about"],
  ["technical status", "/status"],
  ["service detail", "/services/welfare-rights"],
  ["correction form", "/services/welfare-rights/report"],
] as const;

for (const [name, path] of staticJourneys) {
  test(`${name} has no automated WCAG A or AA violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await expectNoAccessibilityViolations(page);
    await expectNoHorizontalOverflow(page);
  });
}

test("search results remain accessible after the dynamic update", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByLabel("What support are you looking for?").fill("money and debt advice");
  await page.getByRole("button", { name: /Find support/ }).click();
  await expect(page.getByRole("heading", { name: "Support that may help" })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await expectNoHorizontalOverflow(page);
});

test("production responses include the security and privacy headers", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(response).not.toBeNull();
  const headers = response?.headers() ?? {};

  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("'strict-dynamic'");
  expect(headers["content-security-policy"]).not.toContain("'unsafe-inline'");
  expect(headers["content-security-policy"]).not.toContain("'unsafe-eval'");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
});

test("health check exposes only bounded availability state", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});

async function expectNoAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations, formatViolations(result.violations)).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow, "page must not overflow horizontally").toBe(false);
}

function formatViolations(violations: Array<{ id: string; impact?: string | null; nodes: unknown[] }>) {
  return violations
    .map((violation) => `${violation.impact ?? "unknown"}: ${violation.id} (${violation.nodes.length} nodes)`)
    .join("\n");
}
