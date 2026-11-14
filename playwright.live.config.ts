import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against a DEPLOYED site (not a local server): `LIVE_SITE_URL=https://... SITE_BASIC_AUTH=user:password npm run test:live`.
 * They use the real hosted API through the site's own proxy, so they prove the whole chain browser -> frontend -> API -> database.
 * A free-tier API sleeps after 15 idle minutes and needs about a minute to wake, hence the generous timeouts.
 */
const credentials = process.env.SITE_BASIC_AUTH ?? "";
const separator = credentials.indexOf(":");

export default defineConfig({
  testDir: "./tests/live",
  timeout: 180_000,
  expect: { timeout: 90_000 },
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.LIVE_SITE_URL,
    httpCredentials:
      separator > 0
        ? {
            username: credentials.slice(0, separator),
            password: credentials.slice(separator + 1),
          }
        : undefined,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
