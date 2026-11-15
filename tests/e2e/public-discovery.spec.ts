import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { API } from "./helpers/api";
import { mockAccountApi } from "./helpers/account";

const UNIVERSITIES = [
  {
    slug: "synthetic-fi-a",
    name: "Synthetic University of Alpha",
    city: "Alphaville",
    countryCode: "FI",
    countryName: "Finland",
    websiteUrl: "https://example.test/alpha",
    trackedPrograms: 3,
    verifiedOn: "2026-11-01",
  },
  {
    slug: "synthetic-fi-b",
    name: "Synthetic Beta Institute",
    city: null,
    countryCode: "FI",
    countryName: "Finland",
    websiteUrl: null,
    trackedPrograms: 0,
    verifiedOn: null,
  },
];

/** The public API as the backend serves it: identity fields only. Records which protected endpoints the page asks for. */
async function mockPublic(page: Page, options: { failList?: boolean } = {}) {
  const protectedCalls: string[] = [];
  const headers = { "access-control-allow-origin": "*" };
  await page.route(
    new RegExp(`^${API}/api/v1/(programs|universities|discovery)`),
    (route) => {
      protectedCalls.push(route.request().url());
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        headers,
        body: JSON.stringify({ status: 401, code: "UNAUTHENTICATED" }),
      });
    },
  );
  await page.route(
    new RegExp(`^${API}/api/v1/public/universities`),
    (route) => {
      const url = new URL(route.request().url());
      if (options.failList && url.pathname.endsWith("/universities"))
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          headers,
          body: "{}",
        });
      const slug = url.pathname.split("/").pop();
      if (slug && slug !== "universities") {
        const found = UNIVERSITIES.find((u) => u.slug === slug);
        return route.fulfill({
          status: found ? 200 : 404,
          contentType: "application/json",
          headers,
          body: JSON.stringify(found ?? { status: 404 }),
        });
      }
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const content = UNIVERSITIES.filter((u) =>
        u.name.toLowerCase().includes(q),
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers,
        body: JSON.stringify({
          content,
          number: 0,
          size: 12,
          totalElements: content.length,
          totalPages: 1,
        }),
      });
    },
  );
  return protectedCalls;
}

test.describe("a visitor can explore universities without an account", () => {
  test("search, cards, details and honest limits, without touching the protected catalogue", async ({
    page,
  }) => {
    await mockAccountApi(page);
    const protectedCalls = await mockPublic(page);
    await page.goto("/universities");
    await expect(page.getByText("What is covered today")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(2);
    await expect(page.getByText("3 programs tracked")).toBeVisible();
    await expect(
      page.getByText("No program is tracked right now"),
    ).toBeVisible();
    await expect(
      page.getByText("Verification date not available"),
    ).toBeVisible();
    // no country dropdown full of countries that are not available
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByLabel(/country/i)).toHaveCount(0);

    await page
      .getByRole("searchbox", { name: "Search universities by name" })
      .fill("alpha");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
    await page
      .getByRole("searchbox", { name: "Search universities by name" })
      .fill("zzzz");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("No university matches")).toBeVisible();

    await page
      .getByRole("searchbox", { name: "Search universities by name" })
      .fill("");
    await page.getByRole("button", { name: "Search" }).click();
    await page
      .getByRole("link", { name: "Synthetic University of Alpha" })
      .click();
    await expect(page).toHaveURL(/\/universities\/synthetic-fi-a/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Synthetic University of Alpha",
      }),
    ).toBeVisible();
    const official = page
      .getByRole("link", { name: /Official website/ })
      .first();
    await expect(official).toHaveAttribute(
      "href",
      "https://example.test/alpha",
    );
    await expect(
      page.getByText("not everything the university teaches"),
    ).toBeVisible();
    await expect(
      page.getByText("Program details open to signed-in beta accounts"),
    ).toBeVisible();
    expect(protectedCalls).toEqual([]); // a visitor never asked for the protected catalogue
  });

  test("an unknown university and a failing service are explained", async ({
    page,
  }) => {
    await mockAccountApi(page);
    await mockPublic(page);
    await page.goto("/universities/zz-unknown");
    await expect(page.getByText("This university is not listed")).toBeVisible();
    const failing = await page.context().newPage();
    await mockAccountApi(failing);
    await mockPublic(failing, { failList: true });
    await failing.goto("/universities");
    await expect(
      failing.getByText("The universities could not be loaded"),
    ).toBeVisible();
  });

  test("the home page offers Explore universities and shows real tracked universities", async ({
    page,
  }) => {
    await mockAccountApi(page);
    await mockPublic(page);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Explore universities" }).first(),
    ).toHaveAttribute("href", "/universities");
    await expect(
      page.getByText("Universities you can explore now"),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Synthetic University of Alpha" })
      .click();
    await expect(page).toHaveURL(/\/universities\/synthetic-fi-a/);
  });
});

test.describe("saving needs a free account and brings the visitor back", () => {
  test("Save explains why, Log in returns to the same university, and the save then works", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    api.accounts.push({
      id: "s1",
      email: "student@example.test",
      password: "synthetic-pass-phrase-1",
      displayName: "Sam",
    });
    await mockPublic(page);
    await page.goto("/universities/synthetic-fi-a");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByText("A free account is needed to save"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign up" }).last(),
    ).toHaveAttribute("href", /next=%2Funiversities%2Fsynthetic-fi-a/);
    await page.getByRole("link", { name: "Log in" }).last().click();
    await expect(page).toHaveURL(
      /\/login\?next=%2Funiversities%2Fsynthetic-fi-a/,
    );
    await page.getByLabel("Email address").fill("student@example.test");
    await page.getByLabel("Password").fill("synthetic-pass-phrase-1");
    await page.locator("main form button[type=submit]:visible").first().click();
    await expect(page).toHaveURL(/\/universities\/synthetic-fi-a/); // back where they were
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
    expect(api.saved.get("s1")?.universities).toEqual(["synthetic-fi-a"]);
  });

  test("Sign up also returns to the page the visitor came from", async ({
    page,
  }) => {
    await mockAccountApi(page);
    await mockPublic(page);
    await page.goto("/signup?next=%2Funiversities%2Fsynthetic-fi-b");
    await page.getByLabel("Email address").fill("new@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("synthetic-pass-phrase-1");
    await page.getByLabel(/I have read the/).check();
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(page).toHaveURL(/\/universities\/synthetic-fi-b/);
  });
});

test.describe("quality", () => {
  for (const path of ["/universities", "/universities/synthetic-fi-a", "/"]) {
    test(`${path}: no overflow, no accessibility violations (light and dark)`, async ({
      page,
    }) => {
      await mockAccountApi(page);
      await mockPublic(page);
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await page.waitForTimeout(700);
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
});
