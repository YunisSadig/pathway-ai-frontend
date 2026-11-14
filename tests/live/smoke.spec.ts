import { expect, test } from "@playwright/test";

/** Smoke tests of the deployed site. They read real data, so they assert shape and presence, never specific facts. */

test("the site answers behind its password and the home page renders", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the API through the site's proxy returns programs and universities", async ({
  request,
}) => {
  const programs = await request.get("/api/v1/programs?size=5");
  expect(programs.status()).toBe(200);
  const body = await programs.json();
  expect(Array.isArray(body.content)).toBe(true);
  expect(body.totalElements).toBeGreaterThan(0);
  // never shared-cacheable: the proxy holds the staging key
  expect(programs.headers()["cache-control"] ?? "").not.toMatch(/\bpublic\b/i);

  const universities = await request.get("/api/v1/universities?size=5");
  expect(universities.status()).toBe(200);
  expect((await universities.json()).totalElements).toBeGreaterThan(0);
});

test("a program detail page renders its real name from the live API", async ({
  page,
  request,
}) => {
  const list = await (await request.get("/api/v1/programs?size=1")).json();
  const program = list.content[0];
  expect(program?.identifier).toBeTruthy();
  await page.goto(`/programs/${program.identifier}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    program.name,
  );
});

test("a university detail page renders its real name from the live API", async ({
  page,
  request,
}) => {
  const list = await (await request.get("/api/v1/universities?size=1")).json();
  const university = list.content[0];
  expect(university?.slug).toBeTruthy();
  await page.goto(`/universities/${university.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    university.name,
  );
});

test("an unknown program shows a clear not-found state, not fabricated data", async ({
  page,
}) => {
  await page.goto("/programs/zz--does-not-exist");
  await expect(page.getByRole("status")).toContainText(
    /couldn.t find this program/i,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
});
