import type { Profile } from "./types";

/**
 * How much of the profile is filled in. This is a count of fields the student chose to provide: it is not a score, not an eligibility
 * result and never used as one.
 */
export function profileCompleteness(p: Profile | null): {
  filled: number;
  total: number;
  missing: string[];
} {
  const checks: [string, boolean][] = [
    ["Country where you live", !!p?.currentCountry],
    ["Current or previous university", !!p?.currentUniversity],
    ["Current level of study", !!p?.currentDegreeLevel],
    ["Field of study", !!p?.fieldOfStudy],
    ["Grades and grading scale", p?.gpa != null && p?.gpaScaleMax != null],
    ["Language qualification", (p?.languageQualifications.length ?? 0) > 0],
    ["Degree you are aiming for", !!p?.targetDegreeLevel],
    ["Preferred intake", !!p?.intakeSeason && p?.intakeYear != null],
    ["Preferred destinations", (p?.preferredDestinations.length ?? 0) > 0],
    ["Yearly tuition budget", p?.maxAnnualTuition != null],
  ];
  return {
    filled: checks.filter(([, ok]) => ok).length,
    total: checks.length,
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}
