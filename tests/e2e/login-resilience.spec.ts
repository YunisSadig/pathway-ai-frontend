import { expect, test, type Page } from "@playwright/test";
import { mockAccountApi } from "./helpers/account";

const EMAIL = "student@example.test";
const PASSWORD = "synthetic-pass-phrase-1";

async function setup(page: Page) {
  const api = await mockAccountApi(page);
  api.accounts.push({
    id: "synthetic-1",
    email: EMAIL,
    password: PASSWORD,
    displayName: "Sam",
  });
  return api;
}

const submitButton = (page: Page) =>
  page.locator("main form button[type=submit]:visible").first();

async function fillAndSubmit(page: Page) {
  await page.getByLabel("Email address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await submitButton(page).click();
}

test.describe("login never leaves the button on 'Logging in…'", () => {
  test("the reported flow: log in, log out, come back through the Log in link, and log in again", async ({
    page,
    isMobile,
  }) => {
    const api = await setup(page);
    await page.goto("/login");
    await fillAndSubmit(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // log out (desktop menu, or the mobile drawer)
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("button", { name: "Log out" }).click();
    } else {
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: "Log out" }).click();
    }
    await expect(page).toHaveURL("http://localhost:3100/", { timeout: 20_000 });

    // come back the way a person does: a client-side navigation to the login page (the router keeps the old page alive)
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Log in" })
        .click();
    } else {
      await page.getByRole("link", { name: "Log in" }).first().click();
    }
    await expect(page).toHaveURL(/\/login/);
    await expect(submitButton(page)).toBeEnabled();
    await expect(submitButton(page)).toHaveText("Log in"); // not "Logging in…"
    await expect(page.getByLabel("Password")).toHaveValue(""); // and the old password is gone

    await fillAndSubmit(page);
    await expect(page).toHaveURL(/\/dashboard/);
    expect(api.calls.filter((c) => c.path === "/login")).toHaveLength(2);
  });

  test("a double click sends one login request", async ({ page }) => {
    const api = await setup(page);
    api.delays.set("/login", 800);
    await page.goto("/login");
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await submitButton(page).dblclick();
    await page
      .getByLabel("Password")
      .press("Enter")
      .catch(() => undefined);
    await expect(page).toHaveURL(/\/dashboard/);
    expect(api.calls.filter((c) => c.path === "/login")).toHaveLength(1);
  });

  test("a slow cold start shows progress, then signs in without failing", async ({
    page,
  }) => {
    const api = await setup(page);
    api.delays.set("/login", 4000); // longer than the progress thresholds, shorter than the 6 s test bound
    await page.goto("/login");
    await fillAndSubmit(page);
    await expect(submitButton(page)).toBeDisabled();
    await expect(
      page.getByText(/may be waking up after a quiet period/),
    ).toBeVisible();
    await expect(
      page.getByText(/Still waiting for the service to wake up/),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("a request that never answers ends with a clear error, and the form works again", async ({
    page,
  }) => {
    const api = await setup(page);
    api.hang.add("/login");
    await page.goto("/login");
    await fillAndSubmit(page);
    await expect(page.getByText(/taking too long to answer/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(submitButton(page)).toBeEnabled();
    await expect(submitButton(page)).toHaveText("Log in");
    // the second try is answered and succeeds
    await submitButton(page).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("a wrong password ends the busy state, and the right one then gets in", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/login");
    await page.getByLabel("Email address").fill(EMAIL);
    await page.getByLabel("Password").fill("wrong-password-123");
    await submitButton(page).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(submitButton(page)).toBeEnabled();
    await page.getByLabel("Password").fill(PASSWORD);
    await submitButton(page).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("the session survives a refresh and the intended page is reached", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/login?next=%2Fsettings");
    await fillAndSubmit(page);
    await expect(page).toHaveURL(/\/settings/);
    await page.reload();
    await expect(page).toHaveURL(/\/settings/);
    await expect(
      page.getByRole("heading", { name: "Account", exact: true }),
    ).toBeVisible(); // signed-in card, not the login prompt
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("a signed-in person who opens the login page is sent on", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/login");
    await fillAndSubmit(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/login?next=%2Fsaved");
    await expect(page).toHaveURL(/\/saved/);
  });

  test("an unsafe next target is ignored", async ({ page }) => {
    await setup(page);
    await page.goto("/login?next=https%3A%2F%2Fevil.test%2Fx");
    await fillAndSubmit(page);
    await expect(page).toHaveURL(/localhost:3100\/dashboard/);
  });
});

test.describe("sign up has the same guarantees", () => {
  test("registering signs in at once, and a hung registration ends with an error", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    await page.goto("/signup");
    api.hang.add("/register");
    await page.getByLabel("Email address").fill("new@example.test");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel(/I have read the/).check();
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(page.getByText(/taking too long to answer/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Create your account" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(page).toHaveURL(/\/dashboard\?welcome=1/);
  });
});
