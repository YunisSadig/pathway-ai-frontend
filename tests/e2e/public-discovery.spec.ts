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

const PROGRAMS = [
  {
    identifier: "synthetic-fi-a--synthetic-physics",
    slug: "synthetic-physics",
    name: "Synthetic Physics",
    degreeLevel: "MASTER",
    field: { slug: "physics", name: "Physics" },
    studyMode: "FULL_TIME",
    durationMonths: 24,
    teachingLanguages: ["en"],
    campusCity: "Alphaville",
    university: {
      slug: "synthetic-fi-a",
      name: "Synthetic University of Alpha",
      city: "Alphaville",
      countryCode: "FI",
      countryName: "Finland",
    },
    officialProgramUrl: "https://example.test/alpha/physics",
    officialAdmissionsUrl: null,
    officialApplicationUrl: null,
    verification: { status: "VERIFIED", verifiedOn: "2026-11-01" },
  },
  {
    identifier: "synthetic-fi-a--synthetic-law",
    slug: "synthetic-law",
    name: "Synthetic Law",
    degreeLevel: "BACHELOR",
    field: { slug: "law", name: "Law" },
    studyMode: "FULL_TIME",
    durationMonths: null,
    teachingLanguages: ["fi"],
    campusCity: null,
    university: {
      slug: "synthetic-fi-a",
      name: "Synthetic University of Alpha",
      city: "Alphaville",
      countryCode: "FI",
      countryName: "Finland",
    },
    officialProgramUrl: null,
    officialAdmissionsUrl: null,
    officialApplicationUrl: null,
    verification: { status: "VERIFIED", verifiedOn: null },
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
  await page.route(new RegExp(`^${API}/api/v1/public/programs`), (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.split("/").pop();
    if (options.failList && id === "programs")
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        headers,
        body: "{}",
      });
    if (id && id !== "programs") {
      const found = PROGRAMS.find((x) => x.identifier === id);
      return route.fulfill({
        status: found ? 200 : 404,
        contentType: "application/json",
        headers,
        body: JSON.stringify(found ?? { status: 404 }),
      });
    }
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const level = url.searchParams.get("level");
    const content = PROGRAMS.filter(
      (x) =>
        x.name.toLowerCase().includes(q) &&
        (!level || x.degreeLevel === level.toUpperCase()),
    );
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers,
      body: JSON.stringify({
        content,
        number: 0,
        size: 20,
        totalElements: content.length,
        totalPages: 1,
      }),
    });
  });
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
  test("programs and universities, with their filters, open to a visitor without touching the protected catalogue", async ({
    page,
  }) => {
    await mockAccountApi(page);
    const protectedCalls = await mockPublic(page);
    await page.goto("/universities");
    // two views: programs (default) and universities
    await expect(page.getByRole("link", { name: "Programs" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Universities" }).first(),
    ).toBeVisible();
    await expect(page.getByText("What is covered today")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(2);
    // the existing filters are present; the tuition filter is not offered without access to fee data
    await expect(
      page.getByRole("search", { name: "Filter programs" }),
    ).toBeVisible();
    await expect(page.getByText("Maximum tuition per year")).toHaveCount(0);
    const toggle = page.getByRole("button", { name: /^Filters/ });
    if (await toggle.isVisible()) await toggle.click();
    await page
      .getByRole("combobox", { name: "Degree level" })
      .selectOption("master");
    await expect(page).toHaveURL(/level=master/);
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByText("Synthetic Physics").first()).toBeVisible();

    // the universities view
    await page
      .getByRole("navigation", { name: "Browse by" })
      .getByRole("link", { name: "Universities" })
      .click();
    await expect(page).toHaveURL(/view=universities/);
    await expect(
      page.getByText("Synthetic Beta Institute").first(),
    ).toBeVisible();
    expect(protectedCalls).toEqual([]); // browsing never asked for the protected catalogue

    // a program opens to a visitor with its official link and an honest note
    await page.goto("/programs/synthetic-fi-a--synthetic-physics");
    await expect(
      page.getByRole("heading", { level: 1, name: "Synthetic Physics" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Official program page/ }),
    ).toHaveAttribute("href", "https://example.test/alpha/physics");
    await expect(
      page
        .getByText("Fees, deadlines and requirements")
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Synthetic University of Alpha" }),
    ).toHaveAttribute("href", "/universities/synthetic-fi-a");
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("a university page lists its tracked programs and states the honest limits", async ({
    page,
  }) => {
    await mockAccountApi(page);
    await mockPublic(page);
    await page.goto("/universities/synthetic-fi-a");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Synthetic University of Alpha",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Official website/ }).first(),
    ).toHaveAttribute("href", "https://example.test/alpha");
    await expect(
      page.getByRole("link", { name: "Synthetic Physics" }),
    ).toBeVisible();
    await expect(
      page.getByText("not everything the university teaches"),
    ).toBeVisible();
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
    await expect(failing.getByText("We couldn't load programs")).toBeVisible();
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

test.describe("no dead ends and saved universities persist", () => {
  test("a protected program page links back to the university and its official site", async ({
    page,
  }) => {
    await mockAccountApi(page);
    await mockPublic(page);
    await page.goto("/programs/synthetic-fi-a--synthetic-program");
    await expect(
      page.getByText("The university catalogue is in a protected beta"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Synthetic University of Alpha" }),
    ).toHaveAttribute("href", "/universities/synthetic-fi-a");
    await expect(
      page.getByRole("link", { name: "Official website" }),
    ).toHaveAttribute("href", "https://example.test/alpha");
    await expect(
      page.getByRole("link", { name: "Log in" }).last(),
    ).toHaveAttribute("href", /next=%2Funiversities%2Fsynthetic-fi-a/);
  });

  test("an ordinary account saves universities and finds them after logging out and in", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the account menu is a desktop control");
    const api = await mockAccountApi(page);
    api.accounts.push({
      id: "s2",
      email: "ordinary@example.test",
      password: "synthetic-pass-phrase-1",
      displayName: "Ola",
    });
    await mockPublic(page);
    await page.goto("/login?next=%2Funiversities");
    await page.getByLabel("Email address").fill("ordinary@example.test");
    await page.getByLabel("Password").fill("synthetic-pass-phrase-1");
    await page.locator("main form button[type=submit]:visible").first().click();
    await expect(page).toHaveURL(/\/universities$/);
    await page.goto("/universities/synthetic-fi-a");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL("http://localhost:3100/", { timeout: 20_000 });
    await page.goto("/login?next=%2Fsaved");
    await page.getByLabel("Email address").fill("ordinary@example.test");
    await page.getByLabel("Password").fill("synthetic-pass-phrase-1");
    await page.locator("main form button[type=submit]:visible").first().click();
    await expect(page).toHaveURL(/\/saved/);
    await expect(page.getByText("Synthetic University").first()).toBeVisible();
  });
});

test.describe("an account with an unconfirmed email is not held back", () => {
  test("the dashboard shows no confirmation warning and says discovery and saving are available", async ({
    page,
  }) => {
    const api = await mockAccountApi(page);
    api.accounts.push({
      id: "u9",
      email: "unconfirmed@example.test",
      password: "synthetic-pass-phrase-1",
      displayName: "Una",
    });
    await mockPublic(page);
    await page.goto("/login?next=%2Fdashboard");
    await page.getByLabel("Email address").fill("unconfirmed@example.test");
    await page.getByLabel("Password").fill("synthetic-pass-phrase-1");
    await page.locator("main form button[type=submit]:visible").first().click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByText("Your email address is not confirmed"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Explore universities/ }).first(),
    ).toBeVisible();
    await expect(page.getByText("only to invited accounts")).toHaveCount(0);
  });
});
