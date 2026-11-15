import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { NAV } from "../../src/lib/site";
import { mockUniversities } from "./helpers/api";

const PAGES = ["/", ...NAV.map((n) => n.href)];

test("hero shows the headline and two working calls to action", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your future deserves more than a guess.",
  );
  await expect(
    page.getByRole("link", { name: "Create your profile" }).first(),
  ).toHaveAttribute("href", "/signup");
  await expect(
    page.getByRole("link", { name: "Explore universities" }).first(),
  ).toHaveAttribute("href", "/universities");
});

test("every internal link on every page resolves", async ({
  page,
  request,
}) => {
  const seen = new Set<string>();
  for (const href of PAGES) {
    await page.goto(href);
    const hrefs = await page
      .locator("a[href^='/']")
      .evaluateAll((a) => a.map((l) => l.getAttribute("href")!));
    hrefs.forEach((h) => seen.add(h));
  }
  expect(seen.size).toBeGreaterThan(4);
  for (const href of seen)
    expect((await request.get(href)).status(), href).toBe(200);
});

test("does not claim features or data that do not exist", async ({ page }) => {
  for (const href of PAGES) {
    await page.goto(href);
    const text = (await page.locator("main").innerText()).toLowerCase();
    expect(text, href).not.toMatch(
      /\d+% |acceptance rate|apply now|recommended for you|\d+ universities|\d+ programs/,
    );
  }
});

test("homepage stays concise", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  expect(height).toBeLessThan(3200);
});

for (const path of PAGES) {
  for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
    test(`no horizontal overflow on ${path} at ${width}px`, async ({
      page,
    }) => {
      await mockUniversities(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        path === "/universities"
          ? "/universities?region=eu&country=germany"
          : path,
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

for (const scheme of ["light", "dark"] as const) {
  for (const path of [...PAGES, "/universities?region=eu&country=poland"]) {
    test(`no axe violations on ${path} (${scheme})`, async ({ page }) => {
      await mockUniversities(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await page.waitForTimeout(1200);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`),
      ).toEqual([]);
    });
  }
}

test("stale prototype storage is removed without touching other keys", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("seeded")) {
      localStorage.setItem("pathway-ai:store", "{}");
      localStorage.setItem("unrelated", "keep");
      localStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("pathway-ai:store")))
    .toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe(
    "keep",
  );
});
