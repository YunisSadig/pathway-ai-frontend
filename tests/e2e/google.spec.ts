import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockAccountApi } from "./helpers/account";

const START = "/api/v1/account/oauth/google/start";

test.describe("Continue with Google on the login and sign-up pages", () => {
  test("the button appears only when the server offers Google, and it is a plain link to the start address", async ({
    page,
  }) => {
    await mockAccountApi(page, { googleLoginAvailable: true });
    await page.goto("/login?next=%2Fsaved");
    const button = page.getByRole("link", { name: "Continue with Google" });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("href", `${START}?next=%2Fsaved`);
    await page.goto("/signup");
    await expect(
      page.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", START);
  });

  test("without Google credentials on the server there is no button at all", async ({
    page,
  }) => {
    await mockAccountApi(page, { googleLoginAvailable: false });
    await page.goto("/login");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue with Google" }),
    ).toHaveCount(0);
  });

  for (const [code, text] of [
    ["google_conflict", /already exists/],
    ["google_cancelled", /cancelled/],
    ["google_state", /expired or was interrupted/],
    ["google_unverified_email", /did not confirm this email/],
    ["google_failed", /could not be completed/],
  ] as const) {
    test(`a failed attempt (${code}) is explained in words and the email form still works`, async ({
      page,
    }) => {
      await mockAccountApi(page, { googleLoginAvailable: true });
      await page.goto(`/login?error=${code}`);
      await expect(
        page.getByRole("alert").filter({ hasText: text }),
      ).toBeVisible();
      await expect(page.getByLabel("Email address")).toBeVisible();
      // the address carries only a short code, never a token
      expect(page.url()).not.toMatch(/token|code=|secret/i);
    });
  }

  test("a successful Google trip lands on the welcome page signed in, with the right name in the navigation", async ({
    page,
    context,
  }) => {
    const api = await mockAccountApi(page, { googleLoginAvailable: true });
    await page.route(`**${START}**`, async (route) => {
      // what the real flow does after Google: a session is opened and the browser is sent to the welcome page
      api.accounts.push({
        id: "g1",
        email: "gina@example.test",
        password: "",
        displayName: "Gina Google",
        googleOnly: true,
      });
      api.current = api.accounts[0];
      await context.addCookies([
        {
          name: "PATHWAY_SESSION",
          value: "mock",
          url: "http://localhost:3100",
        },
      ]);
      await route.fulfill({
        status: 302,
        headers: { Location: "/dashboard?welcome=1" },
      });
    });
    await page.goto("/login");
    await page.getByRole("link", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(/\/dashboard\?welcome=1/);
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toContainText("Gina");
  });

  test("a Google-only account has no password section and says so; deletion is not offered without a password", async ({
    page,
    context,
  }) => {
    const api = await mockAccountApi(page, { googleLoginAvailable: true });
    api.accounts.push({
      id: "g2",
      email: "only@example.test",
      password: "",
      displayName: "Only",
      googleOnly: true,
    });
    api.current = api.accounts[0];
    await context.addCookies([
      { name: "PATHWAY_SESSION", value: "mock", url: "http://localhost:3100" },
    ]);
    await page.goto("/settings?section=security");
    await expect(page.getByText("this account has no password")).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Delete account…" }),
    ).toHaveCount(0);
    await expect(page.getByText(/cannot be deleted from here/)).toBeVisible();
  });

  test("an account with a password can connect Google after confirming the password", async ({
    page,
    context,
  }) => {
    const api = await mockAccountApi(page, { googleLoginAvailable: true });
    api.accounts.push({
      id: "p1",
      email: "pw@example.test",
      password: "synthetic-pass-phrase-1",
      displayName: "Pat",
    });
    api.current = api.accounts[0];
    await context.addCookies([
      { name: "PATHWAY_SESSION", value: "mock", url: "http://localhost:3100" },
    ]);
    await page.goto("/settings?section=security");
    await expect(
      page.getByRole("button", { name: "Connect Google" }),
    ).toBeDisabled();
    const field = page.getByLabel("Current password").first();
    await field.fill("not the password");
    await page.getByRole("button", { name: "Connect Google" }).click();
    await expect(page.getByText("That password is not correct.")).toBeVisible();
    await field.fill("synthetic-pass-phrase-1");
    await page.getByRole("button", { name: "Connect Google" }).click();
    await expect(page.getByText("Google is now connected.")).toBeVisible();
  });

  for (const path of ["/login", "/signup", "/login?error=google_conflict"]) {
    test(`${path}: no overflow and no accessibility violations with the Google button (light and dark)`, async ({
      page,
    }) => {
      await mockAccountApi(page, { googleLoginAvailable: true });
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await expect(
          page.getByRole("link", { name: "Continue with Google" }),
        ).toBeVisible();
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
      }
    });
  }

  test("the button is reachable and operable with the keyboard", async ({
    page,
  }) => {
    await mockAccountApi(page, { googleLoginAvailable: true });
    await page.goto("/login");
    const button = page.getByRole("link", { name: "Continue with Google" });
    await button.focus();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("href", /oauth\/google\/start/);
  });
});

test.describe("An existing password account connecting Google once", () => {
  const PASSWORD = "synthetic-pass-phrase-1";

  /** The account API mock plus the two linking endpoints: the pending step exists until the right password arrives. */
  async function withPendingLink(
    page: import("@playwright/test").Page,
    context: import("@playwright/test").BrowserContext,
  ) {
    const api = await mockAccountApi(page, { googleLoginAvailable: true });
    api.accounts.push({
      id: "p9",
      email: "pat@example.test",
      password: PASSWORD,
      displayName: "Pat Student",
    });
    const state = { pending: true, misses: 0, sent: [] as string[] };
    await page.route("**/api/v1/account/oauth/google/pending-link", (route) =>
      state.pending
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ email: "pat@example.test" }),
          })
        : route.fulfill({ status: 404, body: "" }),
    );
    await page.route(
      "**/api/v1/account/oauth/google/confirm-link",
      async (route) => {
        const { password } = route.request().postDataJSON() as {
          password: string;
        };
        state.sent.push(password);
        if (!state.pending)
          return route.fulfill({
            status: 410,
            contentType: "application/json",
            body: JSON.stringify({ code: "LINK_EXPIRED", message: "expired" }),
          });
        if (password !== PASSWORD) {
          state.misses += 1;
          if (state.misses >= 2) state.pending = false;
          return route.fulfill({
            status: state.pending ? 403 : 403,
            contentType: "application/json",
            body: JSON.stringify({
              code: "WRONG_PASSWORD",
              message: "Your password is not correct.",
            }),
          });
        }
        state.pending = false;
        api.current = api.accounts[0];
        await context.addCookies([
          {
            name: "PATHWAY_SESSION",
            value: "mock",
            url: "http://localhost:3100",
          },
        ]);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ next: "/dashboard" }),
        });
      },
    );
    return state;
  }

  test("the screen explains the one-time step, a wrong password is refused, the right one connects and signs in with the right name", async ({
    page,
    context,
  }) => {
    await withPendingLink(page, context);
    await page.goto("/login/link-google");
    await expect(
      page.getByRole("heading", { name: "Connect Google to your account" }),
    ).toBeVisible();
    await expect(page.getByText(/pat@example\.test/)).toBeVisible();
    await expect(page.getByText(/using either method/)).toBeVisible();
    await page.getByLabel("Password").fill("not the password");
    await page
      .getByRole("button", { name: "Confirm and connect Google" })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: /not correct/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveValue(""); // never kept
    await page.getByLabel("Password").fill(PASSWORD);
    await page
      .getByRole("button", { name: "Confirm and connect Google" })
      .click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toContainText("Pat");
  });

  test("repeated wrong passwords end the step with an explanation and a way back, and nothing is connected", async ({
    page,
    context,
  }) => {
    const state = await withPendingLink(page, context);
    await page.goto("/login/link-google");
    for (let i = 0; i < 2; i++) {
      await page.getByLabel("Password").fill(`wrong ${i}`);
      await page
        .getByRole("button", { name: "Confirm and connect Google" })
        .click();
      await expect(page.getByLabel("Password")).toHaveValue("");
    }
    // the server has dropped the step: the next try says it expired
    await page.getByLabel("Password").fill("one more");
    await page
      .getByRole("button", { name: "Confirm and connect Google" })
      .click();
    await expect(
      page.getByText(/expired or is no longer available/),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Log in" }).first(),
    ).toBeVisible();
    expect(state.pending).toBe(false);
  });

  test("without a parked step the page says it expired instead of showing a form, and it never offers to skip the password", async ({
    page,
  }) => {
    await mockAccountApi(page, { googleLoginAvailable: true });
    await page.route("**/api/v1/account/oauth/google/pending-link", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await page.goto("/login/link-google");
    await expect(
      page.getByText(/expired or is no longer available/),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`the linking screen is accessible and fits a phone (${scheme})`, async ({
      page,
      context,
    }) => {
      await withPendingLink(page, context);
      await page.setViewportSize({ width: 360, height: 740 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/login/link-google");
      await expect(page.getByLabel("Password")).toBeVisible();
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
