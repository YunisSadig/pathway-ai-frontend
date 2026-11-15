import type { Key } from "@/lib/i18n";

export const SITE = {
  name: "Pathway AI",
  tagline: "Your future deserves more than a guess.",
  description:
    "Pathway AI helps international students understand programs, requirements and costs from official sources before they apply. Create a free profile to get started.",
} as const;

export interface NavItem {
  label: string;
  /** Translation key for the visible text; `label` stays the English name for tests and fallbacks. */
  labelKey: Key;
  href: string;
}

/** The primary pages (the logo is the link to the home page). */
export const NAV: NavItem[] = [
  {
    label: "Universities",
    labelKey: "nav.universities",
    href: "/universities",
  },
  {
    label: "Scholarships",
    labelKey: "nav.scholarships",
    href: "/scholarships",
  },
  { label: "How It Works", labelKey: "nav.how", href: "/how-it-works" },
];
