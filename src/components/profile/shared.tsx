"use client";

import type { Key } from "@/lib/i18n";
import { useT } from "@/lib/i18n";
import type {
  Destinations,
  Options,
  StudentProfile,
} from "@/lib/profile/types";
import type { Problems } from "@/lib/profile/validation";

export interface StepProps {
  draft: StudentProfile;
  update: (change: (p: StudentProfile) => StudentProfile) => void;
  options: Options;
  destinations: Destinations;
  /** Problems already merged: what the step found plus what the server said. */
  problems: Problems;
}

/** Looks up the translated message for a field path. */
export function useProblemText(problems: Problems) {
  const { t } = useT();
  return (path: string): string | null => {
    const problem = problems[path];
    return problem ? t(problem.key, problem.vars) : null;
  };
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="grid gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6"
    >
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A translated label for an enum value, for example `enum.educationStatus.HIGH_SCHOOL`. */
export function enumKey(group: string, value: string): Key {
  return `enum.${group}.${value}` as Key;
}

export const YEARS_AHEAD = 8;

export function yearOptions(from: number, to: number): number[] {
  const out: number[] = [];
  for (let y = from; y <= to; y += 1) out.push(y);
  return out;
}
