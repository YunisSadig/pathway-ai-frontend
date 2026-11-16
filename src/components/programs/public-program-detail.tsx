"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CatalogueProtected } from "@/components/shared/catalogue-protected";
import { SaveButton } from "@/components/saved/save-button";
import { LoadingState } from "@/components/shared/loading-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getPublicProgram } from "@/lib/api/programs";
import { dateLabel, useT } from "@/lib/i18n";
import type { ProgramListItem } from "@/types/program";
import { ProgramDestinations } from "./program-destinations";

/**
 * A program for everyone: the published offering (what the official Konfo API exists to display) with links to the OFFICIAL pages.
 * Fees, deadlines and requirements are not part of the public tier yet and are said so plainly, never guessed.
 */
export function PublicProgramDetail({
  identifier,
  status,
}: {
  identifier: string;
  status: number;
}) {
  const { t, lang } = useT();
  const [p, setP] = useState<ProgramListItem | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getPublicProgram(identifier, { signal: controller.signal })
      .then(setP)
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setFailed(true);
      });
    return () => controller.abort();
  }, [identifier]);

  if (failed)
    return (
      <CatalogueProtected
        status={status}
        universitySlug={identifier.split("--")[0]}
      />
    );
  if (!p) return <LoadingState label="Loading program" rows={4} />;

  const facts: [string, string | null][] = [
    [t("pubprog.university"), p.university.name],
    [t("pubprog.level"), p.degreeLevel.toLowerCase()],
    [t("pubprog.field"), p.field?.name ?? null],
    [
      t("pubprog.duration"),
      p.durationMonths ? t("pubprog.months", { n: p.durationMonths }) : null,
    ],
    [t("pubprog.languages"), p.teachingLanguages.join(", ") || null],
    [t("pubprog.campus"), p.campusCity],
    [
      t("pubprog.checked"),
      p.lastCheckedOn ? dateLabel(p.lastCheckedOn, lang) : null,
    ],
    [
      t("pubprog.verified"),
      p.verification?.verifiedOn
        ? dateLabel(p.verification.verifiedOn, lang)
        : null,
    ],
  ];

  return (
    <article className="grid max-w-3xl gap-6">
      <header>
        <p className="eyebrow">{p.university.name}</p>
        <h1 className="mt-2 title-page">{p.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SaveButton kind="program" id={p.identifier} />
          <Button asChild variant="link" size="link">
            <Link href={`/universities/${p.university.slug}`}>
              {t("catalogue.viewUniversity", { name: p.university.name })}
            </Link>
          </Button>
        </div>
        <div className="mt-5 max-w-sm">
          <ProgramDestinations
            officialProgramUrl={p.officialProgramUrl}
            officialAdmissionsUrl={p.officialAdmissionsUrl}
            showApplicationStatus={false}
          />
        </div>
      </header>
      <section className="card p-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value ?? t("pub.notStated")}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Alert kind="info" title={t("pubprog.limitsTitle")}>
        {t("pubprog.limitsBody")}
      </Alert>
    </article>
  );
}
