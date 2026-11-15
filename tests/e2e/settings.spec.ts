import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockAccountApi } from "./helpers/account";

async function signedIn(page: Page) {
  const api = await mockAccountApi(page);
  api.accounts.push({
    id: "set1",
    email: "settings@example.test",
    password: "synthetic-pass-phrase-1",
    displayName: "Sam",
  });
  await page.goto("/login?next=%2Fsettings");
  await page.getByLabel("Email address").fill("settings@example.test");
  await page.getByLabel("Password").fill("synthetic-pass-phrase-1");
  await page.locator("main form button[type=submit]:visible").first().click();
  await expect(page).toHaveURL(/\/settings/);
  return api;
}

test.describe("settings are organised in three sections", () => {
  test("Profile, Account & Security and Appearance each hold only their own controls", async ({
    page,
  }) => {
    await signedIn(page);
    const nav = page.getByRole("navigation", { name: "Settings sections" });
    await expect(nav.getByRole("link")).toHaveCount(3);
    // Profile (the default for a signed-in student): picture and name, no password, no theme
    await expect(nav.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("button", { name: "Save name" })).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveCount(0);
    await expect(page.getByRole("radio", { name: /^Dark/ })).toHaveCount(0);

    // Account & Security: email and password management, no theme
    await nav.getByRole("link", { name: "Account & Security" }).click();
    await expect(page).toHaveURL(/section=security/);
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expect(page.getByText("settings@example.test")).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Dark/ })).toHaveCount(0);

    // Appearance: theme (and language), no password
    await nav.getByRole("link", { name: "Appearance" }).click();
    await expect(page).toHaveURL(/section=appearance/);
    await expect(page.getByRole("radio", { name: /^Dark/ })).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveCount(0);
  });

  test("editing the name saves, says so, and the account menu shows it", async ({
    page,
    isMobile,
  }) => {
    await signedIn(page);
    await page.getByLabel(/Name/).first().fill("Samira");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByText("Your name was saved.")).toBeVisible();
    if (!isMobile) {
      await expect(
        page.getByRole("button", { name: "Account menu" }),
      ).toContainText("Samira");
    }
  });

  test("the theme choice is applied and kept after a reload", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/settings?section=appearance");
    await page.getByRole("radio", { name: /^Dark/ }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("radio", { name: /^Light/ }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  for (const section of ["profile", "security", "appearance"]) {
    test(`${section}: no overflow, no accessibility violations`, async ({
      page,
    }) => {
      await signedIn(page);
      await page.goto(`/settings?section=${section}`);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`),
      ).toEqual([]);
    });
  }
});
