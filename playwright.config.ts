import { randomUUID } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const testRunIdentity = randomUUID();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres CORRECTION_RATE_LIMIT_SECRET=e2e-only-rate-limit-secret-32-chars PUBLIC_CORRECTIONS_ENABLED=true CORRECTIONS_FALLBACK_OWNER=e2e-fallback CORRECTIONS_REVIEW_HOURS=e2e-review-hours pnpm build && DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres CORRECTION_RATE_LIMIT_SECRET=e2e-only-rate-limit-secret-32-chars PUBLIC_CORRECTIONS_ENABLED=true CORRECTIONS_FALLBACK_OWNER=e2e-fallback CORRECTIONS_REVIEW_HOURS=e2e-review-hours pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 }, extraHTTPHeaders: { "x-vercel-forwarded-for": `${testRunIdentity}-desktop` } },
    },
    {
      name: "mobile-390-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, extraHTTPHeaders: { "x-vercel-forwarded-for": `${testRunIdentity}-390` } },
    },
    {
      name: "mobile-320-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 720 }, hasTouch: true, extraHTTPHeaders: { "x-vercel-forwarded-for": `${testRunIdentity}-320` } },
    },
  ],
});
