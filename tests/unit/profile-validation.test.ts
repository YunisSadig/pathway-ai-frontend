import { describe, expect, it } from "vitest";
import { parseDecimal } from "@/components/ui/number-input";
import { budgetText, examText, gradeText } from "@/lib/profile/format";
import {
  EMPTY_PROFILE,
  type Destinations,
  type Options,
  type StudentProfile,
} from "@/lib/profile/types";
import {
  gradeProblem,
  relevantStages,
  validateStep,
  type Ctx,
} from "@/lib/profile/validation";
import { translate } from "@/lib/i18n";

const options: Options = {
  countries: ["AZ", "KZ", "GE", "UZ", "KG"].map((code) => ({
    code,
    defaultCurrency: "EUR",
  })),
  scales: [
    { scale: "FIVE_POINT", min: "1", max: "5", letters: false },
    { scale: "TEN_POINT", min: "1", max: "10", letters: false },
    { scale: "PERCENT_100", min: "0", max: "100", letters: false },
    { scale: "GPA_4", min: "0", max: "4", letters: false },
    { scale: "LETTER", min: null, max: null, letters: true },
    { scale: "OTHER", min: null, max: null, letters: false },
  ],
  letters: ["A", "B"],
  specializations: [],
  skills: [],
  currencies: ["AZN", "EUR", "USD"],
  commonCurrencies: ["EUR", "USD"],
  languages: ["en", "ru"],
  toeflNewScaleEffectiveFrom: "2026-01-21",
};
const closed: Destinations = {
  restricted: true,
  countries: [],
  universities: [],
};
const open: Destinations = {
  restricted: false,
  countries: [{ code: "FI", name: "Finland" }],
  universities: [],
};
const ctx = (destinations: Destinations = closed): Ctx => ({
  options,
  destinations,
  today: new Date("2026-11-15T00:00:00Z"),
});
const grade = (g: Partial<NonNullable<StudentProfile["school"]>["grade"]>) => ({
  status: "ENTERED" as const,
  scale: null,
  value: null,
  letter: null,
  scaleLabel: null,
  scaleMin: null,
  scaleMax: null,
  ...g,
});
const edu = (over = {}) => ({
  institution: "Synthetic School",
  country: "AZ",
  program: null,
  currentYear: 11,
  graduationYear: 2027,
  grade: null,
  ...over,
});
const profile = (over: Partial<StudentProfile>): StudentProfile => ({
  ...EMPTY_PROFILE,
  ...over,
});

describe("which questions apply", () => {
  it("shows only the stage that matches the education status", () => {
    expect(relevantStages(profile({ educationStatus: "HIGH_SCHOOL" }))).toEqual(
      ["school"],
    );
    expect(relevantStages(profile({ educationStatus: "BACHELOR" }))).toEqual([
      "bachelor",
    ]);
    expect(relevantStages(profile({ educationStatus: "MASTER" }))).toEqual([
      "master",
      "bachelor",
    ]);
    expect(
      relevantStages(
        profile({
          educationStatus: "GRADUATED",
          completedQualification: "MASTER",
        }),
      ),
    ).toEqual(["master"]);
    expect(relevantStages(profile({ educationStatus: "GRADUATED" }))).toEqual(
      [],
    );
    expect(relevantStages(EMPTY_PROFILE)).toEqual([]);
  });

  it("asks a high-school student for school data and never for a university", () => {
    const p = profile({ educationStatus: "HIGH_SCHOOL", school: edu() });
    expect(validateStep("education", p, ctx())).toEqual({});
    expect(
      Object.keys(
        validateStep(
          "education",
          { ...p, school: edu({ institution: "" }) },
          ctx(),
        ),
      ),
    ).toEqual(["school.institution"]);
    // a bachelor's student's missing program is a problem, a school student has no program question
    const b = profile({
      educationStatus: "BACHELOR",
      bachelor: edu({ program: "" }),
    });
    expect(Object.keys(validateStep("education", b, ctx()))).toContain(
      "bachelor.program",
    );
  });

  it("requires the bachelor's qualification of a master's student and the chosen one of a graduate", () => {
    const m = profile({
      educationStatus: "MASTER",
      master: edu({ program: "X", currentYear: 1 }),
    });
    expect(Object.keys(validateStep("education", m, ctx()))).toContain(
      "bachelor.institution",
    );
    const g = profile({ educationStatus: "GRADUATED" });
    expect(
      validateStep("education", g, ctx()).completedQualification,
    ).toBeDefined();
  });

  it("rejects an unsupported country instead of accepting it", () => {
    expect(
      validateStep(
        "background",
        profile({ citizenship: "US", residence: "AZ" }),
        ctx(),
      ).citizenship?.key,
    ).toBe("err.UNSUPPORTED_COUNTRY");
    expect(
      validateStep(
        "background",
        profile({ citizenship: "GE", residence: "AZ" }),
        ctx(),
      ),
    ).toEqual({});
    expect(
      Object.keys(validateStep("background", EMPTY_PROFILE, ctx())),
    ).toEqual(["citizenship", "residence"]);
  });
});

describe("grades are range-checked on their named scale and never converted", () => {
  const cases: [Parameters<typeof grade>[0], boolean][] = [
    [{ scale: "FIVE_POINT", value: 4.5 }, true],
    [{ scale: "FIVE_POINT", value: 5.5 }, false],
    [{ scale: "FIVE_POINT", value: 0 }, false],
    [{ scale: "TEN_POINT", value: 10 }, true],
    [{ scale: "PERCENT_100", value: 78 }, true],
    [{ scale: "PERCENT_100", value: 101 }, false],
    [{ scale: "GPA_4", value: 3.45 }, true],
    [{ scale: "GPA_4", value: 4.3 }, false],
    [{ scale: "GPA_4", value: 3.456 }, false],
    [{ scale: "LETTER", letter: "B" }, true],
    [{ scale: "LETTER" }, false],
    [
      {
        scale: "OTHER",
        scaleLabel: "Out of 20",
        scaleMin: 0,
        scaleMax: 20,
        value: 15.5,
      },
      true,
    ],
    [
      {
        scale: "OTHER",
        scaleLabel: "Out of 20",
        scaleMin: 0,
        scaleMax: 20,
        value: 21,
      },
      false,
    ],
    [
      { scale: "OTHER", scaleLabel: "", scaleMin: 0, scaleMax: 20, value: 5 },
      false,
    ],
    [
      { scale: "OTHER", scaleLabel: "x", scaleMin: 20, scaleMax: 0, value: 5 },
      false,
    ],
    [{ scale: null }, false],
  ];
  for (const [g, valid] of cases)
    it(`${JSON.stringify(g)} -> ${valid ? "valid" : "invalid"}`, () => {
      expect(gradeProblem(grade(g), options) === null).toBe(valid);
    });

  it("accepts an honest 'not available yet' and demands an answer otherwise", () => {
    expect(
      gradeProblem({ ...grade({}), status: "NOT_AVAILABLE_YET" }, options),
    ).toBeNull();
    expect(gradeProblem(null, options)?.key).toBe("err.REQUIRED");
  });

  it("states the scale with the number and does no arithmetic on it", () => {
    const t = (
      key: Parameters<typeof translate>[1],
      vars?: Record<string, string | number>,
    ) => translate("en", key, vars);
    expect(gradeText(grade({ scale: "GPA_4", value: 3.45 }), t, "en")).toBe(
      "3.45 (GPA out of 4.0)",
    );
    expect(gradeText(grade({ scale: "PERCENT_100", value: 78 }), t, "en")).toBe(
      "78 (out of 100)",
    );
    expect(
      gradeText(
        grade({
          scale: "OTHER",
          scaleLabel: "Out of 20",
          scaleMin: 0,
          scaleMax: 20,
          value: 15.5,
        }),
        t,
        "en",
      ),
    ).toBe("15.5 (Out of 20 (0–20))");
    expect(
      gradeText(
        { ...grade({}), status: "NOT_AVAILABLE_YET" },
        (k, v) => translate("ru", k, v),
        "ru",
      ),
    ).toBe("Пока недоступно");
  });
});

describe("experience, exams and budget answers are honest", () => {
  it("lets a student say 'none yet' and 'not taken' without inventing entries", () => {
    const base = {
      studyArea: "CS_IT" as const,
      internshipsStatus: "NONE" as const,
      volunteeringStatus: "NONE" as const,
      examsStatus: "NOT_TAKEN" as const,
    };
    expect(validateStep("experience", profile(base), ctx())).toEqual({});
    expect(
      validateStep(
        "experience",
        profile({ ...base, internshipsStatus: "HAS" }),
        ctx(),
      ).internships,
    ).toBeDefined();
    expect(
      validateStep(
        "experience",
        profile({ ...base, examsStatus: "TAKEN" }),
        ctx(),
      ).exams,
    ).toBeDefined();
    expect(
      Object.keys(validateStep("experience", EMPTY_PROFILE, ctx())),
    ).toEqual([
      "studyArea",
      "internshipsStatus",
      "volunteeringStatus",
      "examsStatus",
    ]);
  });

  it("validates exams by their own official rules", () => {
    const taken = (e: object) =>
      profile({
        studyArea: "CS_IT",
        internshipsStatus: "NONE",
        volunteeringStatus: "NONE",
        examsStatus: "TAKEN",
        exams: [
          {
            exam: "IELTS",
            variant: "ACADEMIC",
            testDate: "2026-03-01",
            overall: 6.5,
            sections: [],
            ...e,
          },
        ],
      });
    const bad = (e: object) =>
      Object.keys(validateStep("experience", taken(e), ctx())).includes(
        "exams[0]",
      );
    expect(bad({})).toBe(false);
    expect(bad({ overall: 6.75 })).toBe(true);
    expect(bad({ overall: 9.5 })).toBe(true);
    expect(bad({ testDate: "2090-01-01" })).toBe(true);
    expect(bad({ testDate: "" })).toBe(true);
    expect(
      bad({
        exam: "TOEFL",
        variant: "NEW_1_6",
        testDate: "2026-03-01",
        overall: 5.5,
      }),
    ).toBe(false);
    expect(
      bad({
        exam: "TOEFL",
        variant: "NEW_1_6",
        testDate: "2025-12-01",
        overall: 5.5,
      }),
    ).toBe(true); // before 21 Jan 2026
    expect(
      bad({
        exam: "TOEFL",
        variant: "NEW_1_6",
        testDate: "2026-03-01",
        overall: 5.25,
      }),
    ).toBe(true);
    expect(
      bad({
        exam: "TOEFL",
        variant: "LEGACY_0_120",
        testDate: "2025-09-01",
        overall: 100,
      }),
    ).toBe(false);
    expect(
      bad({
        exam: "TOEFL",
        variant: "LEGACY_0_120",
        testDate: "2025-09-01",
        overall: 121,
      }),
    ).toBe(true);
    expect(bad({ exam: "SAT", variant: null, overall: 1340 })).toBe(false);
    expect(bad({ exam: "SAT", variant: null, overall: 1700 })).toBe(true);
  });

  it("budgets keep their currency, allow 'not sure' and never need an exchange rate", () => {
    const t = (
      key: Parameters<typeof translate>[1],
      vars?: Record<string, string | number>,
    ) => translate("en", key, vars);
    const p = (budget: StudentProfile["budget"]) =>
      validateStep(
        "preferences",
        profile({ targetDegreeLevel: "MASTER", budget }),
        ctx(),
      );
    expect(p({ status: "AMOUNT", amount: 5000, currency: "AZN" })).toEqual({});
    expect(p({ status: "AMOUNT", amount: 5000, currency: "USD" })).toEqual({});
    expect(p({ status: "NOT_SURE", amount: null, currency: null })).toEqual({});
    expect(
      p({ status: "AMOUNT", amount: 0, currency: "EUR" })["budget.amount"],
    ).toBeDefined();
    expect(
      p({ status: "AMOUNT", amount: 100, currency: null })["budget.currency"],
    ).toBeDefined();
    expect(p(null)["budget.status"]).toBeDefined();
    expect(
      budgetText({ status: "AMOUNT", amount: 5000, currency: "AZN" }, t, "en"),
    ).toContain("AZN");
    expect(
      budgetText({ status: "AMOUNT", amount: 5000, currency: "USD" }, t, "en"),
    ).toContain("$5,000.00");
  });

  it("requires a destination only when the account can see an open one", () => {
    const p = profile({
      targetDegreeLevel: "BACHELOR",
      budget: { status: "NOT_SURE", amount: null, currency: null },
    });
    expect(validateStep("preferences", p, ctx(closed))).toEqual({});
    expect(
      validateStep("preferences", p, ctx(open)).destinations,
    ).toBeDefined();
    expect(
      validateStep("preferences", { ...p, destinations: ["FI"] }, ctx(open)),
    ).toEqual({});
    expect(
      validateStep("preferences", { ...p, intakeSeason: "AUTUMN" }, ctx())
        .intakeYear,
    ).toBeDefined();
  });

  it("formats an exam result with its report type", () => {
    const t = (
      key: Parameters<typeof translate>[1],
      vars?: Record<string, string | number>,
    ) => translate("en", key, vars);
    expect(
      examText(
        {
          exam: "TOEFL",
          variant: "NEW_1_6",
          testDate: "2026-03-01",
          overall: 5.5,
          sections: [],
        },
        t,
        "en",
      ),
    ).toContain("new 1–6 report");
  });
});

describe("decimal input", () => {
  it("accepts both decimal separators and rejects text", () => {
    expect(parseDecimal("3.5")).toBe(3.5);
    expect(parseDecimal("3,5")).toBe(3.5);
    expect(parseDecimal(" 12 ")).toBe(12);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1.2.3")).toBeNull();
  });
});
