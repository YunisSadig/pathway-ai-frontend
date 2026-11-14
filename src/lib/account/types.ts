/** Shapes of the account API (backend: `/api/v1/account/*`). Mirrors the Java records exactly. */

export interface Account {
  id: string;
  email: string;
  displayName: string | null;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  /** True when an administrator has opened the (protected beta) catalogue for this account. */
  catalogueAccess: boolean;
  createdAt: string;
}

/** What the service can really do right now, so the site never offers a button that cannot work. */
export interface AccountConfig {
  registrationOpen: boolean;
  emailDeliveryAvailable: boolean;
  cataloguePublic: boolean;
}

export interface RegisterResponse {
  status: "CREATED" | "CHECK_EMAIL";
  message: string;
  account: Account | null;
}

export type CurrentLevel =
  "SECONDARY" | "BACHELOR" | "MASTER" | "DOCTORATE" | "OTHER";
export type TargetLevel = "BACHELOR" | "MASTER" | "DOCTORATE";
export type IntakeSeason = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";
export type LanguageTest =
  "IELTS" | "TOEFL_IBT" | "PTE" | "DUOLINGO" | "CAMBRIDGE" | "OTHER";

export interface LanguageQualification {
  test: LanguageTest;
  testName?: string | null;
  overall: number;
}

export interface Profile {
  currentCountry: string | null;
  currentUniversity: string | null;
  currentDegreeLevel: CurrentLevel | null;
  fieldOfStudy: string | null;
  gpa: number | null;
  gpaScaleMax: number | null;
  targetDegreeLevel: TargetLevel | null;
  intakeSeason: IntakeSeason | null;
  intakeYear: number | null;
  maxAnnualTuition: number | null;
  maxAnnualTuitionCurrency: string | null;
  languageQualifications: LanguageQualification[];
  preferredDestinations: string[];
  updatedAt: string | null;
}

export interface SavedProgram {
  identifier: string;
  savedAt: string;
  available: boolean;
  name: string | null;
  universityName: string | null;
  universitySlug: string | null;
  degreeLevel: string | null;
}

export interface SavedUniversity {
  slug: string;
  savedAt: string;
  available: boolean;
  name: string | null;
  countryName: string | null;
}

export interface SavedItems {
  programs: SavedProgram[];
  universities: SavedUniversity[];
  /** False when the account may not see the catalogue (then names are withheld). */
  catalogueVisible: boolean;
}

export const LEVEL_LABELS: Record<CurrentLevel, string> = {
  SECONDARY: "Secondary school",
  BACHELOR: "Bachelor's",
  MASTER: "Master's",
  DOCTORATE: "Doctorate",
  OTHER: "Other",
};

export const TARGET_LABELS: Record<TargetLevel, string> = {
  BACHELOR: "Bachelor's",
  MASTER: "Master's",
  DOCTORATE: "Doctorate",
};

export const SEASON_LABELS: Record<IntakeSeason, string> = {
  SPRING: "Spring",
  SUMMER: "Summer",
  AUTUMN: "Autumn",
  WINTER: "Winter",
};

export const TEST_LABELS: Record<LanguageTest, string> = {
  IELTS: "IELTS (0–9)",
  TOEFL_IBT: "TOEFL iBT (0–120)",
  PTE: "PTE Academic (10–90)",
  DUOLINGO: "Duolingo English Test (10–160)",
  CAMBRIDGE: "Cambridge English (80–230)",
  OTHER: "Other test",
};
