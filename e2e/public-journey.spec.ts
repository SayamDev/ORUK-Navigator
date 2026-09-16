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
  await page.getByRole("link", { name: "Find support" }).click();
  await expect(page).toHaveURL(/#find-support$/);
  await expect(page.locator("#find-support")).toBeInViewport();

  const need = page.getByLabel("What support are you looking for?");
  await need.focus();
  await page.keyboard.type("money");
  await expect(page.getByText('Suggestions for "money"')).toBeVisible();
  await page.getByRole("button", { name: "Benefits and money advice" }).click();
  await expect(need).toHaveValue("I need help with money and debt advice");
  await expect(need).toBeFocused();

  await page.getByLabel("Where do you need support?").focus();
  await expect(page.getByLabel("Where do you need support?")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Find support/ })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Support that may help" })).toBeVisible();
  await expect(page.locator(".results-heading-row")).toBeFocused();
  await expect(page.locator(".result-card")).toHaveCount(3);
  await expect(page).toHaveURL("http://localhost:3000/#find-support");
  expect(page.url()).not.toContain("money");
  expect(page.url()).not.toContain("Ashton");

  await page.getByRole("link", { name: "Welfare Rights" }).click();
  await expect(page.getByRole("heading", { name: "Welfare Rights" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source and provenance" })).toBeVisible();

  await page.getByRole("link", { name: /Report a problem/ }).click();
  await expect(page.getByRole("heading", { name: "Report a problem" })).toBeVisible();
  await page.getByLabel("Service information is out of date").check();
  await page.getByLabel(/Tell us more/).fill("The publisher page appears to have changed.");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("heading", { name: "Thank you for flagging this" })).toBeVisible();
  await expect(page.getByText(/Your reference is/)).toContainText(/[0-9a-f-]{36}/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow, `${testInfo.project.name} must not overflow horizontally`).toBe(false);
  expect(browserProblems).toEqual([]);
});
