/** Shapes of the student profile v2 API (backend: `/api/v1/account/student-profile`, `/options`, `/avatar`). Mirrors the Java records. */

export type EducationStatus =
  "HIGH_SCHOOL" | "BACHELOR" | "MASTER" | "GRADUATED";
export type Qualification = "BACHELOR" | "MASTER";
export type StudyArea = "CS_IT" | "ECON_BUSINESS";
export type HasOrNone = "NONE" | "HAS";
export type ExamsStatus = "NOT_TAKEN" | "TAKEN";
export type BudgetStatus = "AMOUNT" | "NOT_SURE";
export type GradeStatus = "ENTERED" | "NOT_AVAILABLE_YET";
export type GradeScale =
  "FIVE_POINT" | "TEN_POINT" | "PERCENT_100" | "GPA_4" | "LETTER" | "OTHER";
export type ExamName = "IELTS" | "TOEFL" | "SAT";
export type TargetLevel = "BACHELOR" | "MASTER";
export type IntakeSeason = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";
export type Stage = "school" | "bachelor" | "master";

export interface Grade {
  status: GradeStatus;
  scale: GradeScale | null;
  value: number | null;
  letter: string | null;
  scaleLabel: string | null;
  scaleMin: number | null;
  scaleMax: number | null;
}

export interface Education {
  institution: string | null;
  country: string | null;
  program: string | null;
  currentYear: number | null;
  graduationYear: number | null;
  grade: Grade | null;
}

export interface Skill {
  code: string | null;
  label: string | null;
}

export interface Experience {
  organization: string;
  role: string;
  field: string | null;
  startMonth: string | null;
  endMonth: string | null;
  ongoing: boolean | null;
  description: string | null;
}

export interface ExamSection {
  section: string;
  score: number;
}

export interface ExamResult {
  exam: ExamName;
  variant: string | null;
  testDate: string;
  overall: number;
  sections: ExamSection[] | null;
}

export interface Budget {
  status: BudgetStatus | null;
  amount: number | null;
  currency: string | null;
}

export interface Onboarding {
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  step: number;
}

export interface StudentProfile {
  citizenship: string | null;
  residence: string | null;
  educationStatus: EducationStatus | null;
  completedQualification: Qualification | null;
  school: Education | null;
  bachelor: Education | null;
  master: Education | null;
  studyArea: StudyArea | null;
  specialization: string | null;
  skills: Skill[];
  internshipsStatus: HasOrNone | null;
  internships: Experience[];
  volunteeringStatus: HasOrNone | null;
  volunteering: Experience[];
  examsStatus: ExamsStatus | null;
  exams: ExamResult[];
  targetDegreeLevel: TargetLevel | null;
  intakeSeason: IntakeSeason | null;
  intakeYear: number | null;
  destinations: string[];
  preferredUniversities: string[];
  budget: Budget | null;
  language: "en" | "ru" | null;
  onboarding: Onboarding;
}

export interface Legacy {
  gpa: number | null;
  gpaScaleMax: number | null;
  currentUniversity: string | null;
  fieldOfStudy: string | null;
  languageQualifications: {
    test: string;
    testName: string | null;
    overall: number;
  }[];
}

export interface StudentProfileView {
  profile: StudentProfile;
  avatar: { present: boolean; version: number };
  completeness: { complete: boolean; missing: string[] };
  legacy: Legacy | null;
  updatedAt: string | null;
}

export interface Options {
  countries: { code: string; defaultCurrency: string }[];
  scales: {
    scale: GradeScale;
    min: string | null;
    max: string | null;
    letters: boolean;
  }[];
  letters: string[];
  specializations: { code: string; area: StudyArea }[];
  skills: { code: string; group: "IT" | "ECON" | "BOTH" }[];
  currencies: string[];
  commonCurrencies: string[];
  languages: string[];
  toeflNewScaleEffectiveFrom: string;
}

export interface Destinations {
  restricted: boolean;
  countries: { code: string; name: string }[];
  universities: { slug: string; name: string; countryCode: string }[];
}

export const EMPTY_PROFILE: StudentProfile = {
  citizenship: null,
  residence: null,
  educationStatus: null,
  completedQualification: null,
  school: null,
  bachelor: null,
  master: null,
  studyArea: null,
  specialization: null,
  skills: [],
  internshipsStatus: null,
  internships: [],
  volunteeringStatus: null,
  volunteering: [],
  examsStatus: null,
  exams: [],
  targetDegreeLevel: null,
  intakeSeason: null,
  intakeYear: null,
  destinations: [],
  preferredUniversities: [],
  budget: null,
  language: null,
  onboarding: { status: "NOT_STARTED", step: 0 },
};

export const EMPTY_EDUCATION: Education = {
  institution: null,
  country: null,
  program: null,
  currentYear: null,
  graduationYear: null,
  grade: null,
};
