import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import { translate } from "@/lib/i18n";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  it("Russian has exactly the English keys (no missing, no extra)", () => {
    const missing = Object.keys(en).filter((k) => !(k in ru));
    const extra = Object.keys(ru).filter((k) => !(k in en));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it("every Russian text uses the same placeholders as the English one", () => {
    const wrong = Object.keys(en).filter(
      (k) =>
        JSON.stringify(placeholders(en[k as keyof typeof en])) !==
        JSON.stringify(placeholders(ru[k as keyof typeof ru])),
    );
    expect(wrong).toEqual([]);
  });

  it("no text is empty and the Russian texts are really Russian where they are sentences", () => {
    for (const [key, text] of Object.entries(ru)) {
      expect(text.trim(), key).not.toBe("");
    }
    const cyrillic = Object.entries(ru).filter(([, text]) =>
      /[А-Яа-яЁё]/.test(text),
    ).length;
    expect(cyrillic).toBeGreaterThan(Object.keys(ru).length * 0.9);
  });

  it("fills placeholders and falls back to English for an unknown key", () => {
    expect(translate("en", "auth.passwordShort", { n: 10 })).toBe(
      "Use at least 10 characters.",
    );
    expect(translate("ru", "auth.passwordShort", { n: 10 })).toBe(
      "Используйте не менее 10 символов.",
    );
    expect(
      translate("en", "dash.savedCounts", { programs: 3, universities: 2 }),
    ).toContain("3 programs");
    // a missing value stays visible instead of printing "undefined"
    expect(translate("en", "auth.passwordShort")).toContain("{n}");
    expect(translate("ru", "no.such.key" as never)).toBe("no.such.key");
  });

  it("every dynamically built key resolves in both languages", () => {
    const groups: Record<string, string[]> = {
      "enum.educationStatus": [
        "HIGH_SCHOOL",
        "BACHELOR",
        "MASTER",
        "GRADUATED",
      ],
      "enum.qualification": ["BACHELOR", "MASTER"],
      "enum.studyArea": ["CS_IT", "ECON_BUSINESS"],
      "enum.exam": ["IELTS", "TOEFL", "SAT"],
      "enum.variant": ["ACADEMIC", "GENERAL", "NEW_1_6", "LEGACY_0_120"],
      "enum.region": ["EU", "US", "CA", "JP", "CN", "KR"],
      "enum.season": ["SPRING", "SUMMER", "AUTUMN", "WINTER"],
      scale: [
        "FIVE_POINT",
        "TEN_POINT",
        "PERCENT_100",
        "GPA_4",
        "LETTER",
        "OTHER",
      ],
      "scale.short": ["FIVE_POINT", "TEN_POINT", "PERCENT_100", "GPA_4"],
      section: [
        "LISTENING",
        "READING",
        "WRITING",
        "SPEAKING",
        "MATH",
        "READING_WRITING",
      ],
      step: [
        "background",
        "education",
        "grades",
        "experience",
        "preferences",
        "review",
      ],
      "edu.help": ["school", "bachelor", "master"],
      "edu.stage": [
        "school",
        "bachelor",
        "master",
        "priorBachelor",
        "completed",
      ],
      "edu.statusHelp": ["HIGH_SCHOOL", "BACHELOR", "MASTER", "GRADUATED"],
      "edu.areaHelp": ["CS_IT", "ECON_BUSINESS"],
      "grades.title": [
        "school",
        "bachelor",
        "master",
        "priorBachelor",
        "completed",
      ],
      "exam.range": [
        "IELTS.ACADEMIC",
        "IELTS.GENERAL",
        "TOEFL.NEW_1_6",
        "TOEFL.LEGACY_0_120",
        "SAT",
      ],
    };
    for (const [prefix, values] of Object.entries(groups))
      for (const v of values)
        expect(`${prefix}.${v}` in en, `${prefix}.${v}`).toBe(true);
    for (const kind of ["internships", "volunteering"])
      for (const suffix of ["", "Help", "Question", "None", "Has", "Entry"])
        expect(`exp.${kind}${suffix}` in en, `exp.${kind}${suffix}`).toBe(true);
    for (const s of ["", "Help"])
      for (const step of [
        "background",
        "education",
        "grades",
        "experience",
        "preferences",
        "review",
      ])
        expect(`step.${step}${s}` in en).toBe(true);
    // the curated skills and specializations offered by the backend
    for (const code of [
      "java",
      "python",
      "javascript_typescript",
      "csharp",
      "sql",
      "react",
      "spring_boot",
      "cloud_computing",
      "data_analysis",
      "machine_learning",
      "excel",
      "financial_analysis",
      "accounting_skill",
      "business_analysis",
      "statistics",
      "econometrics",
      "power_bi",
      "financial_modelling",
    ])
      expect(`enum.skill.${code}` in en, code).toBe(true);
    for (const code of [
      "computer_science",
      "software_engineering",
      "information_technology",
      "cybersecurity",
      "data_science",
      "artificial_intelligence",
      "information_systems",
      "economics",
      "finance",
      "accounting",
      "business_administration",
      "business_analytics",
      "management",
    ])
      expect(`enum.specialization.${code}` in en, code).toBe(true);
  });
});
