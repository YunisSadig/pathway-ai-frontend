import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against a DEPLOYED site (not a local server): `LIVE_SITE_URL=https://... npm run test:live`.
 * The site is public, so no password is involved. They use the real hosted API through the site's own proxy, so they prove the whole
 * chain browser -> frontend -> API -> database, including a throwaway account that is created and deleted again.
 * A free-tier API sleeps after 15 idle minutes and needs about a minute to wake, hence the generous timeouts.
 */
export default defineConfig({
  testDir: "./tests/live",
  timeout: 240_000,
  expect: { timeout: 120_000 },
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.LIVE_SITE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
