import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.RAHAL_E2E_BASE_URL?.replace(/\/$/, "");
const baseURL = externalBaseUrl ?? "http://127.0.0.1:3300";
const databaseUrl =
  process.env.RAHAL_E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command: "pnpm --filter @rahal/api start",
          url: "http://127.0.0.1:4300/api/health",
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            NODE_ENV: "test",
            RAHAL_RELEASE_TIER: "staging",
            PORT: "4300",
            WEB_URL: "http://127.0.0.1:3300",
            DATABASE_URL: databaseUrl,
            AUTH_SECRET: "rahal-e2e-auth-secret-with-at-least-32-characters",
          },
        },
        {
          command: "pnpm --filter @rahal/web start",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            API_URL: "http://127.0.0.1:4300",
            PORT: "3300",
          },
        },
      ],
});
