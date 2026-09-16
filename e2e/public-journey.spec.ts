import { expect, test } from "@playwright/test";

test("keyboard search keeps sensitive input out of the URL and opens reviewed detail", async ({
  page,
}, testInfo) => {
  const browserProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => browserProblems.push(`pageerror: ${error.message}`));

  await page.goto("/", { waitUntil: "networkidle" });
  const need = page.getByLabel("What support are you looking for?");
  await need.focus();
  await page.keyboard.type("money and debt advice");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Where do you need support?")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Find support/ })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Support that may help" })).toBeVisible();
  await expect(page.locator(".results-heading-row")).toBeFocused();
  await expect(page.locator(".result-card")).toHaveCount(3);
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.getByRole("link", { name: "Welfare Rights" }).click();
  await expect(page.getByRole("heading", { name: "Welfare Rights" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source and provenance" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow, `${testInfo.project.name} must not overflow horizontally`).toBe(false);
  expect(browserProblems).toEqual([]);
});
