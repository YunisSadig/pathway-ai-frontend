export const SITE = {
  name: "Pathway AI",
  tagline: "Your future deserves more than a guess.",
  description:
    "Pathway AI helps international students understand programs, requirements and costs from official sources before they apply. Create a free profile to get started.",
} as const;

export interface NavItem {
  label: string;
  href: string;
}

/** The primary pages (the logo is the link to the home page). */
export const NAV: NavItem[] = [
  { label: "Universities", href: "/universities" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "How It Works", href: "/how-it-works" },
];
