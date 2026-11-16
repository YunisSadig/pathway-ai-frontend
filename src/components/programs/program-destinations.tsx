"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

function destination(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

function nationalPortal(url: URL | null): boolean {
  return !!url && ["opintopolku.fi", "studyinfo.fi"].includes(url.hostname);
}

/** Informational university page always leads; the API alone decides cycle eligibility for Apply. */
export function ProgramDestinations({
  officialProgramUrl,
  officialAdmissionsUrl,
  officialApplicationUrl = null,
  showApplicationStatus = true,
}: {
  officialProgramUrl: string | null;
  officialAdmissionsUrl: string | null;
  officialApplicationUrl?: string | null;
  showApplicationStatus?: boolean;
}) {
  const { t } = useT();
  const candidate = destination(officialProgramUrl);
  const program = nationalPortal(candidate) ? null : candidate;
  const admissions = destination(officialAdmissionsUrl);
  const application = destination(officialApplicationUrl);
  const links = [
    { url: program, label: t("pubprog.official"), primary: true },
    { url: admissions, label: t("pubprog.admissions"), primary: false },
    { url: application, label: t("programLinks.apply"), primary: false },
  ];

  return (
    <div className="grid gap-3" aria-label={t("programLinks.destinations")}>
      {links.map(({ url, label, primary }) =>
        url ? (
          <Button key={label} asChild variant={primary ? "primary" : "outline"}>
            <a href={url.href} target="_blank" rel="noopener noreferrer">
              {label}
              <ExternalLink aria-hidden className="size-4 shrink-0" />
              <span className="sr-only"> {t("programLinks.newTab")}</span>
            </a>
          </Button>
        ) : null,
      )}
      {!program ? (
        <p className="text-sm text-muted-foreground">
          {t("programLinks.unknown")}
        </p>
      ) : null}
      {showApplicationStatus && !application ? (
        <p className="text-sm text-muted-foreground">
          {t("programLinks.noApplication")}
        </p>
      ) : null}
      {nationalPortal(application) ? (
        <p className="text-sm text-muted-foreground">
          {t("programLinks.studyinfo")}
        </p>
      ) : null}
    </div>
  );
}
