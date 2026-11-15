import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockAccountApi, type FakeAccountApi } from "./helpers/account";

const PASSWORD = "synthetic-pass-phrase-1";
const EMAIL = "student@example.test";

async function signedIn(
  page: Page,
  destinations?: FakeAccountApi["destinations"],
) {
  const api = await mockAccountApi(page);
  api.accounts.push({
    id: "synthetic-1",
    email: EMAIL,
    password: PASSWORD,
    displayName: "Sam",
  });
  if (destinations) api.destinations = destinations;
  await page.goto("/login");
  await page.getByLabel("Email address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return api;
}

async function pickCountry(
  page: Page,
  label: string,
  search: string,
  option: string,
) {
  const box = page.getByLabel(label, { exact: true });
  await box.click();
  await box.fill(search);
  await page.getByRole("option", { name: option }).click();
}

const next = (page: Page) =>
  page.getByRole("button", { name: "Continue" }).click();
const heading = (page: Page, name: string) =>
  expect(page.getByRole("heading", { level: 2, name })).toBeVisible();

async function background(
  page: Page,
  citizenship = "Azerbaijan",
  residence = "Azerbaijan",
) {
  await heading(page, "Personal background");
  await pickCountry(page, "Citizenship", citizenship.slice(0, 4), citizenship);
  await pickCountry(
    page,
    "Country where you live now",
    residence.slice(0, 4),
    residence,
  );
  await next(page);
}

async function studyField(
  page: Page,
  area = "Computer Science / Information Technology",
) {
  await page.getByRole("radio", { name: area }).click();
}

async function experienceNone(page: Page) {
  await page.getByRole("radio", { name: "No internships yet" }).click();
  await page
    .getByRole("radio", { name: "No volunteering experience yet" })
    .click();
  await page.getByRole("radio", { name: "Not taken yet" }).click();
}

async function budget(page: Page, amount: string) {
  await page.getByRole("radio", { name: "Bachelor's degree" }).click();
  await page.getByRole("radio", { name: "I have a budget" }).click();
  await page.getByLabel("Amount per year").fill(amount);
}

test.describe("guided profile", () => {
  test("an Azerbaijani high-school student completes it with school marks and no university questions", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await background(page);

    await heading(page, "Current education");
    await page.getByRole("radio", { name: /^High school/ }).click();
    await expect(page.getByLabel("School name")).toBeVisible();
    await expect(page.getByLabel("Degree program or major")).toHaveCount(0); // nothing about universities
    await page.getByLabel("School name").fill("Synthetic School 7");
    await pickCountry(page, "Country of education", "Azer", "Azerbaijan");
    await page.getByLabel("Current grade").selectOption({ label: "Grade 11" });
    await page
      .getByLabel("Expected graduation year")
      .selectOption({ index: 2 });
    await studyField(page);
    await next(page);

    await heading(page, "Academic performance");
    await expect(
      page.getByText("Your grades are kept exactly as they are"),
    ).toBeVisible();
    await expect(page.getByLabel("GPA", { exact: false })).toHaveCount(0);
    await page
      .getByRole("radio", { name: "Yes, I will enter my grade" })
      .click();
    await page
      .getByLabel("How are your grades reported?")
      .selectOption({ label: "Marks 1–5 (5 is the highest)" });
    await page.getByLabel("Your grade", { exact: true }).fill("4,5"); // a comma is accepted
    await next(page);

    await heading(page, "Experience and qualifications");
    await experienceNone(page);
    await next(page);

    await heading(page, "Study preferences");
    await budget(page, "5000");
    await next(page);

    await heading(page, "Review and finish");
    await expect(page.getByText("Synthetic School 7")).toBeVisible();
    await expect(page.getByText("4.5 (marks 1–5)")).toBeVisible();
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(page).toHaveURL(/\/universities\?welcome=1/);
    await expect(page.getByText("Your profile is ready")).toBeVisible();
    await page.goto("/profile");
    await expect(page.getByText("Profile complete")).toBeVisible();
    // a finished profile does not tell the student to press Finish again
    await expect(
      page
        .getByText("Check the details below and press Finish.")
        .filter({ visible: true }),
    ).toHaveCount(0);
    const doc = api.documents.get("synthetic-1") as {
      school: { grade: { scale: string; value: number } };
      budget: { currency: string; amount: number };
      onboarding: { status: string };
    };
    expect(doc.school.grade).toMatchObject({ scale: "FIVE_POINT", value: 4.5 });
    expect(doc.budget).toMatchObject({ currency: "AZN", amount: 5000 }); // the student's own currency, never converted
    expect(doc.onboarding.status).toBe("COMPLETED");
  });

  test("a Kazakhstani bachelor's student enters a GPA, an internship and an IELTS result", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await background(page, "Kazakhstan", "Kazakhstan");

    await page.getByRole("radio", { name: /^Bachelor's degree/ }).click();
    await page.getByLabel("University name").fill("Synthetic University A");
    await pickCountry(page, "Country of education", "Kaza", "Kazakhstan");
    await page
      .getByLabel("Degree program or major")
      .fill("Synthetic Computing");
    await page
      .getByLabel("Current year of study")
      .selectOption({ label: "Year 3" });
    await page
      .getByLabel("Expected graduation year")
      .selectOption({ index: 2 });
    await studyField(page);
    await next(page);

    await page
      .getByRole("radio", { name: "Yes, I will enter my grade" })
      .click();
    await page
      .getByLabel("How are your grades reported?")
      .selectOption({ label: "GPA out of 4.0" });
    await page.getByLabel("Your grade", { exact: true }).fill("3.45");
    await next(page);

    await page.getByRole("radio", { name: "Yes, I have" }).first().click();
    await page.getByLabel("Organisation").first().fill("Synthetic Soft LLC");
    await page.getByLabel("Your role").first().fill("Intern");
    await page
      .getByRole("radio", { name: "No volunteering experience yet" })
      .click();
    await page.getByRole("radio", { name: "Yes, I have a result" }).click();
    await page.getByLabel("Test date").fill("2026-03-01");
    await page.getByLabel("Overall score").fill("6.5");
    await next(page);

    await budget(page, "5000");
    await page.getByLabel("Currency").click();
    await page.getByRole("option", { name: /^EUR/ }).click();
    await next(page);
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(page).toHaveURL(/\/universities\?welcome=1/);
    const doc = api.documents.get("synthetic-1") as {
      bachelor: { grade: unknown };
      internships: unknown[];
      exams: { exam: string; overall: number }[];
      budget: { currency: string };
    };
    expect(doc.bachelor.grade).toMatchObject({ scale: "GPA_4", value: 3.45 });
    expect(doc.internships).toHaveLength(1);
    expect(doc.exams[0]).toMatchObject({ exam: "IELTS", overall: 6.5 });
    expect(doc.budget.currency).toBe("EUR");
  });

  test("a master's student must also describe the bachelor's qualification", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/profile/edit");
    await background(page, "Kyrgyzstan", "Kyrgyzstan");
    await page.getByRole("radio", { name: /^Master's degree/ }).click();
    await expect(
      page.getByRole("heading", { level: 3, name: "Your master's program" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: "Your completed bachelor's qualification",
      }),
    ).toBeVisible();
    await next(page);
    await expect(page.getByText("Please check your answers")).toBeVisible(); // nothing was filled in: the step explains what is missing
  });

  test("the grading scale is the student's choice: another scale states its own range", async ({
    page,
  }) => {
    const api = await signedIn(page);
    // the step needs an education status first
    await page.goto("/profile/edit?step=3");
    await expect(
      page.getByText(
        "Choose your current education in the previous step first.",
      ),
    ).toBeVisible();
    // a stored draft: bachelor's student, nothing graded yet
    api.documents.set("synthetic-1", {
      educationStatus: "BACHELOR",
      bachelor: {
        institution: "Synthetic University A",
        country: "KZ",
        program: "X",
        currentYear: 2,
        graduationYear: 2029,
        grade: null,
      },
      skills: [],
      internships: [],
      volunteering: [],
      exams: [],
      destinations: [],
      preferredUniversities: [],
      onboarding: { status: "IN_PROGRESS", step: 2 },
    });
    await page.goto("/profile/edit?step=3");
    await page
      .getByRole("radio", { name: "Yes, I will enter my grade" })
      .click();
    await page
      .getByLabel("How are your grades reported?")
      .selectOption({ label: "Another scale (as on my transcript)" });
    await page.getByLabel("Name of the scale").fill("Out of 20");
    await page.getByLabel("Lowest value of the scale").fill("0");
    await page.getByLabel("Highest value of the scale").fill("20");
    await page.getByLabel("Your grade", { exact: true }).fill("21");
    await next(page);
    await expect(
      page.getByText("On this scale grades run from 0 to 20."),
    ).toBeVisible();
    await page.getByLabel("Your grade", { exact: true }).fill("15,5");
    await next(page);
    await heading(page, "Experience and qualifications");
  });

  test("exam results follow their official rules and never need an invented result", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/profile/edit?step=4");
    await page.getByRole("radio", { name: "Yes, I have a result" }).click();
    await page
      .getByLabel("Exam", { exact: true })
      .selectOption({ label: "TOEFL iBT" });
    await expect(page.getByLabel("Report type")).toHaveValue("NEW_1_6");
    await page.getByLabel("Test date").fill("2025-12-01");
    await page.getByLabel("Overall score").fill("5.5");
    await next(page);
    await expect(
      page.getByText(/exists only for tests taken on or after 21 January 2026/),
    ).toBeVisible();
    await page
      .getByLabel("Report type")
      .selectOption({ label: "earlier 0–120 report" });
    await page.getByLabel("Overall score").fill("100");
    await expect(page.getByText(/exists only for tests taken/)).toHaveCount(0);
    // IELTS older than two years gets the neutral note, never a made-up expiry
    await page
      .getByLabel("Exam", { exact: true })
      .selectOption({ label: "IELTS" });
    await page.getByLabel("Test date").fill("2023-01-10");
    await expect(
      page.getByText(
        /IELTS recommends treating results as valid for two years/,
      ),
    ).toBeVisible();
  });

  test("an unsupported country is explained and cannot be forced", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/profile/edit");
    await page
      .getByRole("button", { name: "My country is not in the list" })
      .first()
      .click();
    await expect(
      page.getByText("This country is not supported yet"),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Azerbaijan, Kazakhstan, Georgia, Uzbekistan and Kyrgyzstan/,
      ),
    ).toBeVisible();
    await next(page);
    await expect(page.getByText("Please check your answers")).toBeVisible();
  });

  test("destinations come from the catalogue: restricted accounts can finish, others choose from what exists", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/profile/edit?step=5");
    await expect(
      page.getByText("Destinations open with the university catalogue"),
    ).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Finland" })).toHaveCount(
      0,
    );
    // regions that are only planned are information, not controls
    const soon = page.getByRole("list", {
      name: "More destinations coming soon",
    });
    await expect(soon.getByText("United States")).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "United States" }),
    ).toHaveCount(0);
  });

  test("an account with access sees Finland and must choose a destination", async ({
    page,
  }) => {
    await signedIn(page, {
      restricted: false,
      countries: [{ code: "FI", name: "Finland" }],
      universities: [
        {
          slug: "synthetic-fi-u",
          name: "Synthetic Finnish University",
          countryCode: "FI",
        },
      ],
    });
    await page.goto("/profile/edit?step=5");
    await page.getByRole("radio", { name: "Bachelor's degree" }).click();
    await page.getByRole("radio", { name: "I'm not sure yet" }).click();
    await next(page);
    await expect(page.getByText("This is required.")).toBeVisible();
    await page.getByRole("checkbox", { name: "Finland" }).check();
    await page
      .getByRole("checkbox", { name: "Synthetic Finnish University" })
      .check();
    await next(page);
    await heading(page, "Review and finish");
    await expect(page.getByText("Finland")).toBeVisible();
  });

  test("USD and the student's own currency are both offered, and nothing is converted", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await background(page, "Uzbekistan", "Uzbekistan");
    await page.goto("/profile/edit?step=5");
    await page.getByRole("radio", { name: "I have a budget" }).click();
    await expect(page.getByLabel("Currency")).toHaveValue(/^UZS/); // defaults to the local currency
    await page.getByLabel("Currency").click();
    await expect(page.getByRole("option", { name: /^USD/ })).toBeVisible();
    await page.getByRole("option", { name: /^USD/ }).click();
    await page.getByLabel("Amount per year").fill("5000");
    await expect
      .poll(
        () =>
          (
            api.documents.get("synthetic-1") as
              { budget?: { currency?: string } } | undefined
          )?.budget?.currency,
      )
      .toBe("USD");
  });

  test("changing the education status keeps the other answers", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit?step=2");
    await page.getByRole("radio", { name: /^High school/ }).click();
    await page.getByLabel("School name").fill("Synthetic School 7");
    await page.getByRole("radio", { name: /^Bachelor's degree/ }).click();
    await page.getByLabel("University name").fill("Synthetic University A");
    await page.getByRole("radio", { name: /^High school/ }).click();
    await expect(page.getByLabel("School name")).toHaveValue(
      "Synthetic School 7",
    );
    await expect
      .poll(
        () =>
          (
            api.documents.get("synthetic-1") as
              { bachelor?: { institution?: string } } | undefined
          )?.bachelor?.institution,
      )
      .toBe("Synthetic University A");
  });

  test("a draft is saved automatically and resumed where the student stopped", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await pickCountry(page, "Citizenship", "Geor", "Georgia");
    await expect
      .poll(
        () =>
          (
            api.documents.get("synthetic-1") as
              { citizenship?: string } | undefined
          )?.citizenship,
      )
      .toBe("GE");
    await pickCountry(page, "Country where you live now", "Geor", "Georgia");
    await next(page);
    await heading(page, "Current education");
    await expect
      .poll(
        () =>
          (
            api.documents.get("synthetic-1") as
              { onboarding?: { step?: number } } | undefined
          )?.onboarding?.step,
      )
      .toBe(1);
    await page.goto("/profile/edit"); // leave and come back: resumes at step 2
    await heading(page, "Current education");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByLabel("Citizenship", { exact: true })).toHaveValue(
      "Georgia",
    );
  });

  test("a failed save is shown, not swallowed", async ({ page }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await expect(page.getByLabel("Citizenship", { exact: true })).toBeVisible();
    api.failNext.set("/student-profile", 500);
    await pickCountry(page, "Citizenship", "Azer", "Azerbaijan");
    await expect(page.getByText(/Not saved yet/)).toBeVisible();
  });
});

test.describe("profile picture", () => {
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR42u3PMQEAAAgDIO1f2hjmGQiQMkVoVJw0JIYhMYwXJgRPKvgrJgBPKkgMIyBxR8ARICtiEQIc2VFAAAAAAElFTkSuQmCC",
    "base64",
  );

  test("upload with a crop step, replace and remove; a default avatar is shown without one", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await expect(
      page.getByRole("img", { name: "Default profile picture" }),
    ).toBeVisible();
    await page
      .locator("input[type=file]")
      .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
    await expect(
      page.getByRole("dialog", { name: "Position your picture" }),
    ).toBeVisible();
    await page.getByRole("slider", { name: "Zoom" }).fill("2");
    await page.getByRole("button", { name: "Save picture" }).click();
    await expect(
      page.getByRole("img", { name: /Profile picture/ }),
    ).toBeVisible();
    expect(api.avatars.get("synthetic-1")).toBe(1);
    await page
      .getByRole("button", { name: "Replace picture" })
      .click()
      .catch(() => undefined);
    await page.getByRole("button", { name: "Remove picture" }).click();
    await expect(
      page.getByRole("img", { name: "Default profile picture" }),
    ).toBeVisible();
    expect(api.avatars.size).toBe(0);
  });

  test("something that is not a picture is refused before it leaves the browser", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await page.locator("input[type=file]").setInputFiles({
      name: "evil.png",
      mimeType: "text/plain",
      buffer: Buffer.from("<?php echo 1;"),
    });
    await expect(
      page.getByText("Use a JPEG, PNG or WebP picture."),
    ).toBeVisible();
    expect(api.avatars.size).toBe(0);
  });
});

test.describe("language and appearance", () => {
  test("Russian is a real language: header, wizard, errors and settings switch, and the choice is remembered", async ({
    page,
  }) => {
    const api = await signedIn(page);
    await page.goto("/profile/edit");
    await page.goto("/settings");
    await page.getByRole("radio", { name: "Русский" }).click();
    await page.goto("/profile/edit");
    await expect(
      page.getByRole("heading", { level: 2, name: "О вас" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Продолжить" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await page.getByRole("button", { name: "Продолжить" }).click();
    await expect(page.getByText("Обязательное поле.").first()).toBeVisible(); // validation errors are translated
    await expect.poll(() => api.languages).toContain("ru");
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 2, name: "О вас" }),
    ).toBeVisible(); // remembered across loads
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Внешний вид" }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "English" }).click();
    await expect(
      page.getByRole("heading", { name: "Appearance" }),
    ).toBeVisible();
  });

  test("the theme defaults to the system and follows it until the student chooses", async ({
    page,
  }) => {
    await mockAccountApi(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/settings");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("radio", { name: /^System/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveClass(/light/); // follows the operating system
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("radio", { name: /^System/ }).click();
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveClass(/light/);
    // there is one place for the theme: no switch in the header
    await expect(
      page.getByRole("button", { name: "Change theme" }),
    ).toHaveCount(0);
  });
});

test.describe("quality", () => {
  for (const step of [1, 2, 3, 4, 5, 6]) {
    test(`step ${step} has no overflow and no accessibility violations (light and dark)`, async ({
      page,
    }) => {
      await signedIn(page);
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`/profile/edit?step=${step}`);
        await expect(
          page.getByRole("heading", { level: 2 }).first(),
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

  test("the profile page and settings have no violations in Russian", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/settings");
    await page.getByRole("radio", { name: "Русский" }).click();
    await page.goto("/profile/edit");
    for (const path of ["/profile", "/settings", "/dashboard"]) {
      await page.goto(path);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`),
        path,
      ).toEqual([]);
    }
  });

  test("interactive controls show a pointer and disabled ones do not", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/profile/edit?step=2");
    const cursor = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).cursor);
    expect(await cursor("button:has-text('Continue')")).toBe("pointer");
    expect(await cursor("[role=radio]")).toBe("pointer");
    expect(await cursor("header a[href='/universities']")).toBe("pointer");
    await page.goto("/profile/edit?step=1");
    expect(
      await cursor("nav[aria-label='Profile progress'] button:disabled"),
    ).toBe("not-allowed");
  });
});
