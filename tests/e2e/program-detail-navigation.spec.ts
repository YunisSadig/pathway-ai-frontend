import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockUniversities, signedInWithCatalogueAccess } from "./helpers/api";

/**
 * Section navigation of the program page, tested through real scrolling: the bar must stay stuck under the
 * site header for the whole page (not only while the key-facts band is in view), name the section being read,
 * never let an anchored heading slide under it, and work with the keyboard and on a phone-sized strip.
 * Program 02 has requirements, deadlines and sources, so every tab exists.
 */
test.beforeEach(async ({ page }) => {
  await signedInWithCatalogueAccess(page);
});

const url = "/programs/synthetic-de-2--program-02";
const TABS = ["Overview", "Tuition", "Admissions", "Deadlines", "Sources"];
const IDS = ["overview", "tuition", "admissions", "deadlines", "sources"];

async function open(page: Page) {
  // a short viewport guarantees that the page scrolls through every section on any project
  const size = page.viewportSize();
  await page.setViewportSize({ width: size?.width ?? 1280, height: 640 });
  await mockUniversities(page);
  await page.goto(url);
  await page.getByRole("navigation", { name: "On this page" }).waitFor();
  await expect(
    page.getByRole("heading", { level: 2, name: "Sources" }),
  ).toBeVisible();
}

/** Waits until smooth scrolling has finished. */
async function settled(page: Page) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => Math.round(window.scrollY));
        const same = y === last;
        last = y;
        return same;
      },
      { intervals: [150, 150, 150, 150], timeout: 6000 },
    )
    .toBe(true);
}

const rect = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)!.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  }, selector);

const NAV = 'nav[aria-label="On this page"]';

test.describe("program page section navigation", () => {
  test("stays stuck under the site header while scrolling through every section", async ({
    page,
  }) => {
    await open(page);
    const nav = page.getByRole("navigation", { name: "On this page" });
    const range = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(range).toBeGreaterThan(800); // the page really is long enough to leave the navigation behind

    // before scrolling it sits in the page, well below the header (the key-facts band is above it)
    const headerBottom = (await rect(page, "body header")).bottom;
    expect((await rect(page, NAV)).top).toBeGreaterThan(headerBottom + 20);

    let previous = 0;
    for (const [i, label] of TABS.entries()) {
      await nav.getByRole("link", { name: label }).click();
      await settled(page);
      const y = await page.evaluate(() => Math.round(window.scrollY));
      if (i > 0) expect(y).toBeGreaterThan(previous);
      previous = y;
      const bar = await rect(page, NAV);
      const header = await rect(page, "body header");
      // stuck: directly under the header (the header's 1px border overlaps), fully inside the viewport
      expect(bar.top).toBeGreaterThanOrEqual(header.bottom - 3);
      // Overview is the section right under the bar: jumping to it barely scrolls the page, so the bar may still be
      // in its normal place there (visible, just below the header). Every later section must find it stuck.
      if (i > 0) expect(bar.top).toBeLessThanOrEqual(header.bottom + 1);
      else expect(bar.top).toBeLessThan(header.bottom + 20);
      expect(bar.bottom).toBeLessThan(200);
      await expect(nav).toBeInViewport({ ratio: 1 });
      // the heading reached through the anchor is not hidden behind the header or the navigation
      const heading = page.locator(`#${IDS[i]}-title`);
      await expect(heading).toBeInViewport();
      expect(
        await heading.evaluate((e) => e.getBoundingClientRect().top),
      ).toBeGreaterThanOrEqual(bar.bottom - 1);
    }

    // at the very end of the article, the last content on the page above the footer. (A sticky bar is bounded by
    // its container, so once the footer scrolls in, the bar leaves with the end of the article: that is expected.)
    await page.evaluate(() => {
      const article = document.querySelector("article")!;
      window.scrollTo({
        top:
          window.scrollY +
          article.getBoundingClientRect().bottom -
          window.innerHeight,
        behavior: "instant",
      });
    });
    await settled(page);
    const end = await rect(page, NAV);
    const header = await rect(page, "body header");
    expect(end.top).toBeGreaterThanOrEqual(header.bottom - 3);
    expect(end.top).toBeLessThanOrEqual(header.bottom + 1);
    await expect(nav).toBeInViewport({ ratio: 1 });
  });

  test("highlights the section being read, and only one", async ({ page }) => {
    await open(page);
    const nav = page.getByRole("navigation", { name: "On this page" });
    const current = nav.locator('[aria-current="location"]');
    const place = (id: string, below: number) =>
      page.evaluate(
        ({ id, below }) => {
          const el = document.getElementById(id)!;
          const bar = document.querySelector('nav[aria-label="On this page"]')!;
          const header = document.querySelector("body header")!;
          const barRect = bar.getBoundingClientRect();
          // where the bar's bottom edge will be once it is stuck under the header (it may not be stuck yet)
          const stuckBottom =
            header.getBoundingClientRect().bottom - 1 + barRect.height;
          window.scrollTo({
            top:
              window.scrollY +
              el.getBoundingClientRect().top -
              stuckBottom -
              below,
            behavior: "instant",
          });
        },
        { id, below },
      );

    for (const [i, id] of IDS.entries()) {
      await place(id, 8); // heading just under the navigation: this section is being read
      await expect(current).toHaveText(TABS[i]);
      await expect(current).toHaveCount(1);
    }
    // heading still far below the navigation: the previous section is the one being read
    await place("deadlines", 260);
    await expect(current).toHaveText("Admissions");
    // top of the page, then the very end
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(current).toHaveText("Overview");
    await page.evaluate(() =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      }),
    );
    await expect(current).toHaveText("Sources");
  });

  test("clicking a tab marks it at once and keeps it while the page scrolls there", async ({
    page,
  }) => {
    await open(page);
    const nav = page.getByRole("navigation", { name: "On this page" });
    await nav.getByRole("link", { name: "Deadlines" }).click();
    await expect(nav.locator('[aria-current="location"]')).toHaveText(
      "Deadlines",
    );
    await settled(page);
    await expect(nav.locator('[aria-current="location"]')).toHaveText(
      "Deadlines",
    );
    await expect(page).toHaveURL(/#deadlines$/);
  });

  test("scrolling by hand right after a click still ends on the section being read", async ({
    page,
  }) => {
    // regression (found on the deployed site): the click lock ignored scroll events, and nothing re-checked once it
    // expired, so a hand scroll that stopped inside the lock window left the clicked tab highlighted
    await open(page);
    const nav = page.getByRole("navigation", { name: "On this page" });
    await nav.getByRole("link", { name: "Sources" }).click();
    await page.waitForTimeout(300); // inside the lock window
    await page.evaluate(() => {
      const el = document.getElementById("tuition")!;
      const header = document.querySelector("body header")!;
      const bar = document.querySelector('nav[aria-label="On this page"]')!;
      const stuckBottom =
        header.getBoundingClientRect().bottom -
        1 +
        bar.getBoundingClientRect().height;
      window.scrollTo({
        top: window.scrollY + el.getBoundingClientRect().top - stuckBottom - 8,
        behavior: "instant",
      });
    });
    await expect(nav.locator('[aria-current="location"]')).toHaveText(
      "Tuition",
    );
  });

  test("works with the keyboard", async ({ page }) => {
    await open(page);
    const nav = page.getByRole("navigation", { name: "On this page" });
    const first = nav.getByRole("link", { name: "Overview" });
    await first.focus();
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "Tuition" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#admissions$/);
    await settled(page);
    const bar = await rect(page, NAV);
    const heading = page.locator("#admissions-title");
    expect(
      await heading.evaluate((e) => e.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(bar.bottom - 1);
  });

  test("jumps instantly when the user prefers reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    await page
      .getByRole("navigation", { name: "On this page" })
      .getByRole("link", { name: "Sources" })
      .click();
    await page.waitForTimeout(80);
    const early = await page.evaluate(() => Math.round(window.scrollY));
    await settled(page);
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(early);
  });

  test("the strip scrolls sideways and keeps the active tab visible on a phone", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "phone layout only");
    await open(page);
    const nav = page.getByRole("navigation", { name: "On this page" });
    const strip = await page.evaluate(() => {
      const ul = document.querySelector('nav[aria-label="On this page"] ul')!;
      return { scroll: ul.scrollWidth, client: ul.clientWidth };
    });
    expect(strip.scroll).toBeGreaterThan(strip.client); // not every tab fits: it scrolls instead of wrapping
    await expect(nav.locator('[data-edge="end"]')).toHaveClass(/opacity-100/);
    await expect(nav.locator('[data-edge="start"]')).toHaveClass(/opacity-0/);

    await nav.getByRole("link", { name: "Sources" }).click();
    await settled(page);
    await expect(nav.locator('[aria-current="location"]')).toHaveText(
      "Sources",
    );
    await expect
      .poll(async () => {
        const ul = await rect(page, `${NAV} ul`);
        const tab = await rect(page, `${NAV} [aria-current="location"]`);
        return tab.left >= ul.left - 1 && tab.right <= ul.right + 1;
      })
      .toBe(true);
    await expect(nav.locator('[data-edge="start"]')).toHaveClass(/opacity-100/);

    // scrolling back up brings the first tab back into view
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(nav.locator('[aria-current="location"]')).toHaveText(
      "Overview",
    );
    await expect
      .poll(async () => {
        const ul = await rect(page, `${NAV} ul`);
        const tab = await rect(page, `${NAV} [aria-current="location"]`);
        return tab.left >= ul.left - 1 && tab.right <= ul.right + 1;
      })
      .toBe(true);
  });

  test("outdated fees are folded away but keep their warning and source once opened", async ({
    page,
  }) => {
    await open(page);
    const tuition = page.getByRole("region", { name: "Tuition & funding" });
    // current fee first, always visible; the outdated one is not
    await expect(tuition).toContainText("EUR 2,000");
    await expect(tuition.getByText("This period has ended")).not.toBeVisible();
    await tuition.getByText(/Outdated fees/).click();
    await expect(tuition.getByText("This period has ended")).toBeVisible();
    await expect(tuition).toContainText("EUR 1,500");
  });

  test("has no accessibility violations with the navigation stuck", async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole("navigation", { name: "On this page" })
      .getByRole("link", { name: "Admissions" })
      .click();
    await settled(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`),
    ).toEqual([]);
  });
});
