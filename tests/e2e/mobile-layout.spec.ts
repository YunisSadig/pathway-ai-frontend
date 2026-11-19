import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockAccountApi } from "./helpers/account";
import {
  FIXTURES,
  PROGRAMS,
  mockUniversities,
  signedInWithCatalogueAccess,
} from "./helpers/api";

// Narrow-screen layout guard: no sideways scrolling, tap targets that meet WCAG 2.5.8 (24px, with its inline,
// label and spacing exceptions), no text under the 14px design-system minimum, the mobile menu inside the
// screen, and axe clean at 320px. Viewports are set per test, so the "mobile" project would only repeat it.
test.skip(({ isMobile }) => isMobile, "viewports are set per test");

const PUBLIC = [
  "/",
  "/universities",
  "/how-it-works",
  "/scholarships",
  "/login",
  "/signup",
  "/terms",
];
const CATALOGUE = [
  "/universities",
  `/universities/${FIXTURES[0].slug}`,
  `/programs/${encodeURIComponent(PROGRAMS[0].identifier)}`,
];
const PRIVATE = [
  "/dashboard",
  "/profile",
  "/profile/edit",
  "/saved",
  "/settings",
];
const WIDTHS = [320, 390];

interface Problems {
  overflow: number;
  smallTargets: string[];
  smallText: string[];
}

async function layoutProblems(page: Page): Promise<Problems> {
  return page.evaluate(() => {
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()} "${((el as HTMLElement).innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40)}"`;
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== "hidden" &&
        !el.closest("[aria-hidden=true], .sr-only, [inert]")
      );
    };
    const targets = Array.from(
      document.querySelectorAll(
        "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem]",
      ),
    ).filter(shown);
    const rects = targets.map((t) => t.getBoundingClientRect());
    const smallTargets: string[] = [];
    targets.forEach((el, i) => {
      const r = rects[i];
      if (r.width >= 24 && r.height >= 24) return;
      // inline exception: a link inside a sentence
      const block = el.parentElement;
      if (
        el.tagName === "A" &&
        block &&
        (block.textContent ?? "").trim().length >
          (el.textContent ?? "").trim().length + 3
      )
        return;
      // the wrapping label is the real target
      if (el.closest("label")) return;
      // a stretched link covers its whole card
      if (getComputedStyle(el, "::after").position === "absolute") return;
      // spacing exception: a 24px circle on its centre touches no other target
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const crowded = rects.some((o, j) => {
        if (j === i || targets[j].contains(el) || el.contains(targets[j]))
          return false;
        const dx = Math.max(o.left - cx, 0, cx - o.right);
        const dy = Math.max(o.top - cy, 0, cy - o.bottom);
        return Math.hypot(dx, dy) < 12;
      });
      if (crowded)
        smallTargets.push(
          `${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        );
    });

    const smallText: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !(n.textContent ?? "").trim() || !shown(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 14) smallText.push(`${describe(el)} ${size}px`);
    }
    return {
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      smallTargets,
      smallText,
    };
  });
}

async function expectClean(page: Page, path: string, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  const p = await layoutProblems(page);
  const where = `${path} @ ${width}px`;
  expect(p.overflow, `${where}: horizontal overflow`).toBeLessThanOrEqual(0);
  expect(p.smallTargets, `${where}: tap targets under 24px`).toEqual([]);
  expect(p.smallText, `${where}: text under 14px`).toEqual([]);
  if (width === 320) {
    const axe = await new AxeBuilder({ page }).analyze();
    // report each failing node with its colours, not just the rule id
    expect(
      axe.violations.flatMap((v) =>
        v.nodes.map((n) => {
          const d = n.any[0]?.data as
            | { fgColor?: string; bgColor?: string; contrastRatio?: number }
            | undefined;
          const colours = d?.contrastRatio
            ? ` fg ${d.fgColor} bg ${d.bgColor} ratio ${d.contrastRatio}`
            : "";
          return `${v.id} ${n.target.join(" ")}${colours} ${n.html.slice(0, 160)}`;
        }),
      ),
      `${where}: axe`,
    ).toEqual([]);
  }
}

test("public pages fit narrow screens", async ({ page }) => {
  test.setTimeout(120_000);
  await mockAccountApi(page);
  await mockUniversities(page);
  for (const width of WIDTHS)
    for (const path of PUBLIC) await expectClean(page, path, width);
});

test("signed-in and catalogue pages fit narrow screens", async ({ page }) => {
  test.setTimeout(120_000);
  const api = await mockAccountApi(page);
  await mockUniversities(page);
  api.accounts.push({
    id: "mob1",
    email: "mobile@example.test",
    password: "synthetic-pass-phrase-1",
    displayName: "Synthetic Student With A Long Display Name",
  });
  await page.goto("/login?next=%2Fdashboard");
  await page.getByLabel("Email address").fill("mobile@example.test");
  await page.getByLabel("Password").fill("synthetic-pass-phrase-1");
  await page.locator("main form button[type=submit]:visible").first().click();
  await expect(page).toHaveURL(/\/dashboard/);
  await signedInWithCatalogueAccess(page);
  for (const width of WIDTHS)
    for (const path of [...PRIVATE, ...CATALOGUE])
      await expectClean(page, path, width);

  // the profile wizard's step buttons were 6px bars on phones; the design system asks for 44px targets
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/profile/edit");
  const steps = page
    .getByRole("navigation", { name: "Profile progress" })
    .getByRole("button");
  await expect(steps).toHaveCount(6);
  for (const height of await steps.evaluateAll((b) =>
    b.map((e) => e.getBoundingClientRect().height),
  ))
    expect(height).toBeGreaterThanOrEqual(44);
});

test("the mobile menu opens inside the screen and closes", async ({ page }) => {
  await mockAccountApi(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Universities" }),
  ).toBeVisible();
  // the panel slides in from the right: once it settles it lies fully inside the 320px screen
  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();
      return box && box.x >= 0 && box.x + box.width <= 320;
    })
    .toBe(true);
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(dialog).toBeHidden();

  // at tablet width the full navigation replaces the menu button and still fits
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
