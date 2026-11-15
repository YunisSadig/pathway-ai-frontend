import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockAccountApi } from "./helpers/account";

const PASSWORD = "synthetic-pass-phrase-1";
const EMAIL = "student@example.test";

const seeded = (api: Awaited<ReturnType<typeof mockAccountApi>>) =>
  api.accounts.push({
    id: "synthetic-1",
    email: EMAIL,
    password: PASSWORD,
    displayName: null,
  });

async function logIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("public site", () => {
  test("opens without a browser password prompt and offers sign up and log in", async ({
    page,
  }) => {
    await mockAccountApi(page);
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["www-authenticate"]).toBeUndefined();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create your profile" }).first(),
    ).toHaveAttribute("href", "/signup");
    await expect(
      page.getByRole("link", { name: "Explore the platform" }).first(),
    ).toHaveAttribute("href", "/how-it-works");
  });

  for (const path of [
    "/about",
    "/privacy",
    "/terms",
    "/contact",
    "/login",
    "/signup",
  ]) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await mockAccountApi(page);
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("private pages", () => {
  for (const path of [
    "/dashboard",
    "/profile",
    "/profile/edit",
    "/saved",
    "/settings",
  ]) {
    test(`${path} sends a visitor to log in`, async ({ page }) => {
      await mockAccountApi(page);
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
      await expect(page.getByText("Please log in to continue.")).toBeVisible();
    });
  }

  test("a forged cookie opens nothing: the server decides", async ({
    page,
  }) => {
    await mockAccountApi(page);
    await page.context().addCookies([
      {
        name: "PATHWAY_SESSION",
        value: "forged",
        url: "http://localhost:3100",
      },
    ]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("account lifecycle", () => {
  test("sign up with consent, then the session survives a refresh", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    await page.goto("/signup");
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByLabel("Name").fill("Sam");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(
      page.getByText(/Please confirm that you have read/),
    ).toBeVisible();
    expect(api.accounts).toHaveLength(0);
    await page.getByLabel(/I have read the/).check();
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Sam").first()).toBeAttached();
  });

  test("a weak password and a taken address are explained", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    seeded(api);
    await page.goto("/signup");
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel(/I have read the/).check();
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("wrong password gets one neutral message, the right one gets in", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    seeded(api);
    await page.goto("/login");
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("The email address or the password is not correct."),
    ).toBeVisible();
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("the login page only returns to a path on this site", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    seeded(api);
    await page.goto("/login?next=" + encodeURIComponent("https://evil.test/x"));
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/localhost:3100\/dashboard/);
  });

  test("profile edits persist, no score is invented, and a save failure is shown", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    seeded(api);
    await logIn(page);
    await page.goto("/profile");
    await expect(
      page.getByText(/probability|chance of|match score/i),
    ).toHaveCount(0);

    await page.goto("/profile/edit");
    const save = page.getByRole("button", { name: "Save profile" });
    await expect(save).toBeVisible();
    api.failNext.set("/profile", 500);
    await save.click();
    await expect(page.getByRole("alert").first()).toBeVisible();

    await page
      .getByLabel(/Current or previous university/)
      .fill("Synthetic University");
    await page.getByLabel(/Field of study/).fill("Synthetic Engineering");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page).toHaveURL(/\/profile(\?|$)/);
    await expect(page.getByText("Synthetic University")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Synthetic Engineering")).toBeVisible();
  });

  test("an ended session sends the student back to log in", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    seeded(api);
    await logIn(page);
    await api.expireSession();
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("deleting the account needs the password and removes the data", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    seeded(api);
    await logIn(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete account…" }).click();
    await page
      .getByLabel("Enter your password to confirm")
      .fill("wrong-password-123");
    await page
      .getByRole("button", { name: "Delete my account permanently" })
      .click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    expect(api.accounts).toHaveLength(1);
    await page.getByLabel("Enter your password to confirm").fill(PASSWORD);
    await page
      .getByRole("button", { name: "Delete my account permanently" })
      .click();
    await expect(page).toHaveURL(/\/login\?.*reason=deleted/);
    expect(api.accounts).toHaveLength(0);
  });

  test("logging out closes the private pages again", async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "the account menu is a desktop control; mobile uses the drawer",
    );
    const api = await mockAccountApi(page);
    seeded(api);
    await logIn(page);
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL("http://localhost:3100/");
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});

test("a visitor sees an honest protected state in the catalogue", async ({
  page,
}) => {
  await mockAccountApi(page);
  await page.route("http://api.pathway.test/api/v1/programs*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Please log in.",
      }),
    }),
  );
  await page.goto("/universities");
  await expect(
    page.getByRole("link", { name: /log in/i }).first(),
  ).toBeVisible();
});
