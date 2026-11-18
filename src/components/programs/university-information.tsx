"use client";

import { Evidence } from "@/components/shared/detail-ui";
import { ExternalLink, TemporalBadge } from "@/components/shared/fact-ui";
import { dateLabel, useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n";
import type { UniversityFact, UniversitySourceCheck } from "@/types/program";

const LABELS: Record<string, Key> = {
  qualification: "unifact.qualification",
  credits: "unifact.credits",
  duration_structure: "unifact.duration",
  study_mode: "unifact.mode",
  campus: "unifact.campus",
  eligibility: "unifact.eligibility",
  application_period: "unifact.period",
  tuition_scope: "unifact.tuition",
  scholarship: "unifact.scholarship",
  overview: "unifact.overview",
  structure: "unifact.structure",
  specializations: "unifact.specializations",
  documents: "unifact.documents",
  selection: "unifact.selection",
  language_tests: "unifact.languages",
  entrance_tests: "unifact.tests",
  instructions: "unifact.instructions",
  financial_url: "unifact.financeLink",
  curriculum_url: "unifact.curriculumLink",
  official_admissions_url: "pubprog.admissions",
};

const DATED = new Set([
  "application_period",
  "tuition_scope",
  "scholarship",
  "eligibility",
  "documents",
  "selection",
  "language_tests",
  "entrance_tests",
]);

export function UniversityInformation({
  facts = [],
  fields,
}: {
  facts?: UniversityFact[];
  fields: string[];
}) {
  const { t, lang } = useT();
  // The university's own page leads; the official national record (scope "studyinfo") fills a field only when the
  // page does not state it, so one fact is never shown twice from two sources.
  const fromPage = new Set(
    facts.filter((f) => f.scope !== "studyinfo").map((f) => f.field),
  );
  const shown = facts.filter(
    (f) =>
      fields.includes(f.field) &&
      (f.scope !== "studyinfo" || !fromPage.has(f.field)),
  );
  if (!shown.length) return null;
  return (
    <dl className="grid gap-5">
      {shown.map((fact) => (
        <div
          key={`${fact.field}-${fact.scope}-${fact.source.url}`}
          className="grid gap-2 border-b border-border pb-5 last:border-0"
        >
          <dt className="font-semibold">
            {t(LABELS[fact.field] ?? "unifact.information")}
          </dt>
          <dd className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  fact.verificationStatus === "VERIFIED"
                    ? "text-success"
                    : "text-warning"
                }
              >
                {t(
                  fact.verificationStatus === "PENDING_REVIEW"
                    ? "unifact.pending"
                    : fact.verificationStatus === "STALE"
                      ? "unifact.stale"
                      : "unifact.verified",
                )}
              </span>
              {DATED.has(fact.field) ? (
                <TemporalBadge status={fact.temporalStatus} />
              ) : null}
            </div>
            {/^https:\/\//.test(fact.value) ? (
              <ExternalLink href={fact.value}>
                {t(LABELS[fact.field] ?? "unifact.information")}
              </ExternalLink>
            ) : fact.value.length > 600 ? (
              <details>
                <summary className="cursor-pointer font-medium text-primary-soft-foreground">
                  {t("unifact.readFull")}
                </summary>
                <p className="mt-2 max-w-prose leading-relaxed break-words whitespace-pre-line">
                  {fact.value}
                </p>
              </details>
            ) : (
              <p className="max-w-prose leading-relaxed break-words whitespace-pre-line">
                {fact.value}
              </p>
            )}
            {fact.applicantCategory === "NON_EU_EEA" ? (
              <p className="text-muted-foreground">
                {t("unifact.audienceNonEu")}
              </p>
            ) : null}
            {fact.field === "tuition_scope" ? (
              <p className="text-muted-foreground">
                {fact.academicYear
                  ? t("unifact.yearStated", { year: fact.academicYear })
                  : t("unifact.yearNotStated")}
              </p>
            ) : null}
            {fact.temporalStatus === "UNKNOWN_YEAR" && DATED.has(fact.field) ? (
              <p className="text-muted-foreground">
                {t("unifact.unknownPeriod")}
              </p>
            ) : null}
            {fact.verificationStatus !== "VERIFIED" ? (
              <p className="text-muted-foreground">
                {t("unifact.reviewNotice")}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              {t("unifact.checked", {
                date: dateLabel(fact.lastSuccessfulCheck.slice(0, 10), lang),
              })}
            </p>
            <Evidence source={fact.source} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function UniversitySourceChecks({
  sources,
}: {
  sources: UniversitySourceCheck[];
}) {
  const { t, lang } = useT();
  if (!sources.length) return null;
  return (
    <details className="mt-6 text-sm">
      <summary className="cursor-pointer font-semibold">
        {t("unifact.sourceChecks")}
      </summary>
      <p className="mt-3 text-muted-foreground">
        {t("unifact.separateChecks")}
      </p>
      <ul className="mt-3 grid gap-4">
        {sources.map((source) => (
          <li key={source.url} className="grid gap-1">
            <ExternalLink href={source.url}>
              {source.publisher ?? t("unifact.information")}
            </ExternalLink>
            <p>
              {source.lastSuccessAt
                ? t("unifact.checked", {
                    date: dateLabel(source.lastSuccessAt.slice(0, 10), lang),
                  })
                : t("unifact.neverChecked")}
            </p>
            {source.status !== "ACTIVE" ? (
              <p className="text-warning">{t("unifact.stale")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
