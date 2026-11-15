"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { countryLabel } from "@/lib/account/countries";
import {
  LEVEL_LABELS,
  SEASON_LABELS,
  TARGET_LABELS,
  TEST_LABELS,
  type Profile,
} from "@/lib/account/types";
import { useProfile } from "@/lib/account/use-profile";

const NONE = "Not provided";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="card p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <dl className="mt-2 divide-y divide-border">{children}</dl>
    </section>
  );
}

function money(p: Profile): string {
  if (p.maxAnnualTuition == null) return NONE;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: p.maxAnnualTuitionCurrency ?? "EUR",
      maximumFractionDigits: 0,
    }).format(p.maxAnnualTuition);
  } catch {
    return `${p.maxAnnualTuition} ${p.maxAnnualTuitionCurrency ?? ""}`;
  }
}

export function ProfileView() {
  const params = useSearchParams();
  const { state } = useProfile();

  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        className="h-72 animate-pulse rounded-xl bg-muted"
      >
        <span className="sr-only">Loading your profile…</span>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Alert kind="error" title="Your profile could not be loaded">
        {state.message}
      </Alert>
    );
  }
  const p = state.profile;
  return (
    <div className="grid gap-5">
      {params.get("saved") ? (
        <Alert kind="success">Your profile was saved.</Alert>
      ) : null}
      <div>
        <Button asChild>
          <Link href="/profile/edit">Edit profile</Link>
        </Button>
      </div>
      <Section title="About your studies">
        <Row label="Country where you live">
          {p.currentCountry ? countryLabel(p.currentCountry) : NONE}
        </Row>
        <Row label="University">{p.currentUniversity ?? NONE}</Row>
        <Row label="Current level">
          {p.currentDegreeLevel ? LEVEL_LABELS[p.currentDegreeLevel] : NONE}
        </Row>
        <Row label="Field of study">{p.fieldOfStudy ?? NONE}</Row>
        <Row label="Grade">
          {p.gpa != null && p.gpaScaleMax != null
            ? `${p.gpa} out of ${p.gpaScaleMax}`
            : NONE}
        </Row>
      </Section>
      <Section title="Language qualifications">
        {p.languageQualifications.length === 0 ? (
          <Row label="Tests">{NONE}</Row>
        ) : (
          p.languageQualifications.map((q) => (
            <Row
              key={q.test}
              label={
                q.test === "OTHER"
                  ? (q.testName ?? "Other test")
                  : TEST_LABELS[q.test].split(" (")[0]
              }
            >
              Overall {q.overall}
            </Row>
          ))
        )}
      </Section>
      <Section title="Your plans">
        <Row label="Degree you are aiming for">
          {p.targetDegreeLevel ? TARGET_LABELS[p.targetDegreeLevel] : NONE}
        </Row>
        <Row label="Preferred intake">
          {p.intakeSeason && p.intakeYear
            ? `${SEASON_LABELS[p.intakeSeason]} ${p.intakeYear}`
            : NONE}
        </Row>
        <Row label="Preferred destinations">
          {p.preferredDestinations.length
            ? p.preferredDestinations.map((c) => countryLabel(c)).join(", ")
            : NONE}
        </Row>
        <Row label="Yearly tuition budget">{money(p)}</Row>
      </Section>
      <p className="text-sm text-muted-foreground">
        This information is only used to show you your own options. It is never
        turned into a score or an admission chance, and you can export or delete
        it in{" "}
        <Link href="/settings" className="font-semibold underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
