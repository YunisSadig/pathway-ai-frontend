import { expect, test } from "@playwright/test";

/**
 * Smoke tests of the deployed public site and the hosted account service behind it. They assert shape and behaviour, never specific
 * facts. The account test creates ONE throwaway account (random address, random password, never printed) and deletes it at the end.
 */

test("the home page opens with no password prompt and offers sign up and log in", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["www-authenticate"]).toBeUndefined();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create your profile" }).first(),
  ).toBeVisible();
});

test("the catalogue is closed to anonymous visitors, also with a forged session", async ({
  request,
}) => {
  for (const area of ["programs", "universities"]) {
    const anonymous = await request.get(`/api/v1/${area}?size=1`);
    expect(anonymous.status(), area).toBe(401);
    expect(await anonymous.text()).not.toMatch(/"content"\s*:/);
    const forged = await request.get(`/api/v1/${area}?size=1`, {
      headers: { Cookie: "PATHWAY_SESSION=forged-session-value" },
    });
    expect(forged.status(), `${area} with a forged cookie`).toBe(401);
  }
});

test("private pages need a session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("a student can sign up, edit the profile, log out, log in and delete the account", async ({
  page,
  request,
}) => {
  const config = await (await request.get("/api/v1/account/config")).json();
  test.skip(!config.registrationOpen, "registration is closed on this site");

  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const email = `pathway-smoke-${stamp}@example.com`;
  const password = `Smoke-${Math.random().toString(36).slice(2)}-${stamp}`;

  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Name").fill("Smoke Test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel(/I have read the/).check();
  await page.getByRole("button", { name: "Create your account" }).click();

  if (config.emailDeliveryAvailable) {
    // with working email the address must be confirmed first; a throwaway address cannot be, so stop honestly
    await expect(page.getByText("Check your inbox")).toBeVisible();
    test.skip(
      true,
      "email confirmation is required; the throwaway address cannot confirm",
    );
  }

  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/profile/edit");
  await page
    .getByLabel(/Current or previous university/)
    .fill("Synthetic Smoke University");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page).toHaveURL(/\/profile(\?|$)/);
  await expect(page.getByText("Synthetic Smoke University")).toBeVisible();

  // the session survives a reload
  await page.reload();
  await expect(page.getByText("Synthetic Smoke University")).toBeVisible();

  // the catalogue stays closed to a new account (no catalogue_access)
  const catalogue = await page.request.get("/api/v1/programs?size=1");
  expect(catalogue.status()).toBe(403);

  // log out, then log in again
  const out = await page.request.post("/api/v1/account/logout", {
    headers: { Origin: new URL(page.url()).origin },
  });
  expect(out.status()).toBeLessThan(400);
  await page.context().clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // delete the throwaway account
  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete account…" }).click();
  await page.getByLabel("Enter your password to confirm").fill(password);
  await page
    .getByRole("button", { name: "Delete my account permanently" })
    .click();
  await expect(page).toHaveURL(/\/login\?.*reason=deleted/);

  // the deleted account can no longer log in
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(
    page.getByText("The email address or the password is not correct."),
  ).toBeVisible();
});
