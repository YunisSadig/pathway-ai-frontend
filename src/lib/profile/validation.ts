import type { Key, Vars } from "@/lib/i18n";
import type {
  Destinations,
  Education,
  ExamResult,
  Experience,
  Grade,
  Options,
  Stage,
  StudentProfile,
} from "./types";

/** A message key plus values; the page translates it. Server violation codes are mapped to the same shape. */
export interface Problem {
  key: Key;
  vars?: Vars;
}
export type Problems = Record<string, Problem>;

export interface Ctx {
  options: Options;
  destinations: Destinations;
  /** Today, injectable for tests. */
  today?: Date;
}

export const STEP_COUNT = 6;
export const STEPS = [
  "background",
  "education",
  "grades",
  "experience",
  "preferences",
  "review",
] as const;
export type StepName = (typeof STEPS)[number];

const REQUIRED: Problem = { key: "err.REQUIRED" };

/** The map from a server violation code to a message key. */
export function problemFromCode(code: string | undefined): Problem {
  const known: Record<string, Key> = {
    REQUIRED: "err.REQUIRED",
    UNSUPPORTED_COUNTRY: "err.UNSUPPORTED_COUNTRY",
    OUT_OF_RANGE: "err.OUT_OF_RANGE",
    TOO_PRECISE: "err.TOO_PRECISE",
    INVALID_SCALE: "err.INVALID_SCALE",
    CONFLICT: "err.CONFLICT",
    UNKNOWN_VALUE: "err.UNKNOWN_VALUE",
    INCOMPLETE_PAIR: "err.INCOMPLETE_PAIR",
    DUPLICATE: "err.DUPLICATE",
    CATALOGUE_PROTECTED: "err.CATALOGUE_PROTECTED",
    DESTINATION_UNAVAILABLE: "err.DESTINATION_UNAVAILABLE",
  };
  return { key: (code && known[code]) || "err.INVALID" };
}

/** The education stage that applies to the student's current situation (what the questions are about). */
export function relevantStages(p: StudentProfile): Stage[] {
  switch (p.educationStatus) {
    case "HIGH_SCHOOL":
      return ["school"];
    case "BACHELOR":
      return ["bachelor"];
    case "MASTER":
      return ["master", "bachelor"];
    case "GRADUATED":
      return p.completedQualification === "MASTER"
        ? ["master"]
        : p.completedQualification === "BACHELOR"
          ? ["bachelor"]
          : [];
    default:
      return [];
  }
}

/** Whether a stage is the one the student is currently in (it has a current year); the others are finished. */
export function isCurrentStage(p: StudentProfile, stage: Stage): boolean {
  return (
    (p.educationStatus === "HIGH_SCHOOL" && stage === "school") ||
    (p.educationStatus === "BACHELOR" && stage === "bachelor") ||
    (p.educationStatus === "MASTER" && stage === "master")
  );
}

function blank(s: string | null | undefined): boolean {
  return !s || !s.trim();
}

export function gradeProblem(
  g: Grade | null,
  options: Options,
): Problem | null {
  if (!g || !g.status) return REQUIRED;
  if (g.status === "NOT_AVAILABLE_YET") return null;
  if (!g.scale) return { key: "err.chooseScale" };
  if (g.scale === "LETTER") return g.letter ? null : REQUIRED;
  if (g.value === null || Number.isNaN(g.value)) return REQUIRED;
  if (g.scale === "OTHER") {
    if (blank(g.scaleLabel)) return { key: "err.scaleLabel" };
    if (g.scaleMin === null || g.scaleMax === null || g.scaleMin >= g.scaleMax)
      return { key: "err.INVALID_SCALE" };
    if (g.value < g.scaleMin || g.value > g.scaleMax)
      return {
        key: "err.gradeRange",
        vars: { min: g.scaleMin, max: g.scaleMax },
      };
    return null;
  }
  const def = options.scales.find((s) => s.scale === g.scale);
  const min = Number(def?.min);
  const max = Number(def?.max);
  if (g.value < min || g.value > max)
    return { key: "err.gradeRange", vars: { min, max } };
  if (Math.round(g.value * 100) / 100 !== g.value)
    return { key: "err.TOO_PRECISE" };
  return null;
}

function experienceProblems(
  list: Experience[],
  prefix: string,
  today: Date,
  out: Problems,
) {
  list.forEach((e, i) => {
    const f = `${prefix}[${i}]`;
    if (blank(e.organization)) out[`${f}.organization`] = REQUIRED;
    if (blank(e.role)) out[`${f}.role`] = REQUIRED;
    if (e.startMonth && e.endMonth && e.endMonth < e.startMonth)
      out[`${f}.endMonth`] = { key: "err.endBeforeStart" };
    const current = today.toISOString().slice(0, 7);
    if (e.startMonth && e.startMonth > current)
      out[`${f}.startMonth`] = { key: "err.futureDate" };
  });
}

const HALF = (x: number) => Math.round(x * 2) === x * 2;

export function examProblem(
  r: ExamResult,
  ctx: Ctx,
  today: Date,
): Problem | null {
  if (!r.testDate) return { key: "err.examDate" };
  if (new Date(`${r.testDate}T00:00:00Z`) > today)
    return { key: "err.futureDate" };
  if (r.overall === null || Number.isNaN(r.overall)) return REQUIRED;
  if (r.exam === "IELTS") {
    if (!r.variant) return { key: "err.examVariant" };
    if (r.overall < 1 || r.overall > 9 || !HALF(r.overall))
      return { key: "err.ielts" };
  } else if (r.exam === "TOEFL") {
    if (!r.variant) return { key: "err.examVariant" };
    if (r.variant === "NEW_1_6") {
      if (r.testDate < ctx.options.toeflNewScaleEffectiveFrom)
        return { key: "err.toeflNewDate" };
      if (r.overall < 1 || r.overall > 6 || !HALF(r.overall))
        return { key: "err.toeflNew" };
    } else if (r.overall < 0 || r.overall > 120 || !Number.isInteger(r.overall))
      return { key: "err.toeflLegacy" };
  } else if (r.exam === "SAT") {
    if (r.overall < 400 || r.overall > 1600 || !Number.isInteger(r.overall))
      return { key: "err.sat" };
  }
  return null;
}

function stageProblems(
  p: StudentProfile,
  stage: Stage,
  ctx: Ctx,
  out: Problems,
  withGrade: boolean,
) {
  const e: Education | null = p[stage];
  const current = isCurrentStage(p, stage);
  const needProgram = stage !== "school";
  if (!withGrade) {
    if (!e || blank(e.institution)) out[`${stage}.institution`] = REQUIRED;
    if (!e?.country) out[`${stage}.country`] = REQUIRED;
    else if (!ctx.options.countries.some((c) => c.code === e.country))
      out[`${stage}.country`] = { key: "err.UNSUPPORTED_COUNTRY" };
    if (needProgram && (!e || blank(e.program)))
      out[`${stage}.program`] = REQUIRED;
    if (current) {
      const max = stage === "school" ? 12 : stage === "bachelor" ? 6 : 3;
      if (!e?.currentYear) out[`${stage}.currentYear`] = REQUIRED;
      else if (e.currentYear < 1 || e.currentYear > max)
        out[`${stage}.currentYear`] = { key: "err.OUT_OF_RANGE" };
    }
    if (!e?.graduationYear) out[`${stage}.graduationYear`] = REQUIRED;
    else if (e.graduationYear < 1990 || e.graduationYear > 2045)
      out[`${stage}.graduationYear`] = { key: "err.OUT_OF_RANGE" };
  } else {
    const g = gradeProblem(e?.grade ?? null, ctx.options);
    if (g) out[`${stage}.grade`] = g;
  }
}

/** Problems that block leaving a step. Mirrors the backend rules; the server remains the authority. */
export function validateStep(
  step: StepName,
  p: StudentProfile,
  ctx: Ctx,
): Problems {
  const out: Problems = {};
  const today = ctx.today ?? new Date();
  const supported = (code: string | null) =>
    !!code && ctx.options.countries.some((c) => c.code === code);

  if (step === "background") {
    if (!p.citizenship) out.citizenship = REQUIRED;
    else if (!supported(p.citizenship))
      out.citizenship = { key: "err.UNSUPPORTED_COUNTRY" };
    if (!p.residence) out.residence = REQUIRED;
    else if (!supported(p.residence))
      out.residence = { key: "err.UNSUPPORTED_COUNTRY" };
  }

  if (step === "education") {
    if (!p.educationStatus) out.educationStatus = REQUIRED;
    if (p.educationStatus === "GRADUATED" && !p.completedQualification)
      out.completedQualification = REQUIRED;
    for (const s of relevantStages(p)) stageProblems(p, s, ctx, out, false);
  }

  if (step === "grades") {
    for (const s of relevantStages(p)) stageProblems(p, s, ctx, out, true);
  }

  if (step === "experience") {
    if (!p.studyArea) out.studyArea = REQUIRED;
    if (!p.internshipsStatus) out.internshipsStatus = REQUIRED;
    else if (p.internshipsStatus === "HAS") {
      if (p.internships.length === 0) out.internships = REQUIRED;
      experienceProblems(p.internships, "internships", today, out);
    }
    if (!p.volunteeringStatus) out.volunteeringStatus = REQUIRED;
    else if (p.volunteeringStatus === "HAS") {
      if (p.volunteering.length === 0) out.volunteering = REQUIRED;
      experienceProblems(p.volunteering, "volunteering", today, out);
    }
    if (!p.examsStatus) out.examsStatus = REQUIRED;
    else if (p.examsStatus === "TAKEN") {
      if (p.exams.length === 0) out.exams = REQUIRED;
      p.exams.forEach((r, i) => {
        const problem = examProblem(r, ctx, today);
        if (problem) out[`exams[${i}]`] = problem;
      });
    }
  }

  if (step === "preferences") {
    if (!p.targetDegreeLevel) out.targetDegreeLevel = REQUIRED;
    if ((p.intakeSeason === null) !== (p.intakeYear === null))
      out.intakeYear = { key: "err.INCOMPLETE_PAIR" };
    const d = ctx.destinations;
    if (!d.restricted && d.countries.length > 0 && p.destinations.length === 0)
      out.destinations = REQUIRED;
    const b = p.budget;
    if (!b || !b.status) out["budget.status"] = REQUIRED;
    else if (b.status === "AMOUNT") {
      if (!b.amount || b.amount <= 0)
        out["budget.amount"] = { key: "err.amount" };
      else if (Math.round(b.amount * 100) / 100 !== b.amount)
        out["budget.amount"] = { key: "err.TOO_PRECISE" };
      if (!b.currency) out["budget.currency"] = REQUIRED;
    }
  }
  return out;
}

/** The first step (index into STEPS) that still has a problem, or -1 when every step before the review is fine. */
export function firstIncompleteStep(p: StudentProfile, ctx: Ctx): number {
  for (let i = 0; i < STEPS.length - 1; i++) {
    if (Object.keys(validateStep(STEPS[i], p, ctx)).length) return i;
  }
  return -1;
}
