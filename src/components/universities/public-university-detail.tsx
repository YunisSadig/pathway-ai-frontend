"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SaveButton } from "@/components/saved/save-button";
import { LoadingState } from "@/components/shared/loading-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  getPublicUniversity,
  type PublicUniversity,
} from "@/lib/api/public-universities";
import { dateLabel, useT } from "@/lib/i18n";

/** One institution for everyone: identity, the OFFICIAL website, when we verified it, and an honest note about what is tracked. */
export function PublicUniversityDetail() {
  const { t, lang } = useT();
  const { slug } = useParams<{ slug: string }>();
  const [u, setU] = useState<PublicUniversity | null>(null);
  const [problem, setProblem] = useState<"none" | "missing" | "error">("none");

  useEffect(() => {
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect -- loading restarts when the address changes */
    setU(null);
    setProblem("none");
    /* eslint-enable react-hooks/set-state-in-effect */
    getPublicUniversity(slug, controller.signal)
      .then(setU)
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setProblem(
          e instanceof ApiError && e.status === 404 ? "missing" : "error",
        );
      });
    return () => controller.abort();
  }, [slug]);

  return (
    <div className="page-container section-y">
      <Button asChild variant="link" size="link" className="mb-4">
        <Link href="/universities">
          <ArrowLeft aria-hidden /> {t("pub.back")}
        </Link>
      </Button>
      {problem === "missing" ? (
        <Alert kind="info" title={t("pub.missingTitle")}>
          {t("pub.missingBody")}
        </Alert>
      ) : problem === "error" ? (
        <Alert kind="error" title={t("pub.errorTitle")}>
          {t("pub.errorBody")}
        </Alert>
      ) : u === null ? (
        <LoadingState label={t("pub.loading")} />
      ) : (
        <article className="grid max-w-3xl gap-6">
          <header>
            <p className="eyebrow">{u.countryName}</p>
            <h1 className="mt-2 title-page">{u.name}</h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin aria-hidden className="size-4" />
              {[u.city, u.countryName].filter(Boolean).join(", ")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SaveButton kind="university" id={u.slug} />
              {u.websiteUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={u.websiteUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("pub.official")} <ExternalLink aria-hidden />
                  </a>
                </Button>
              ) : null}
            </div>
          </header>

          <section className="card p-6" aria-labelledby="pub-facts">
            <h2 id="pub-facts" className="text-lg font-bold">
              {t("pub.factsTitle")}
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted-foreground">{t("pub.officialSite")}</dt>
              <dd className="font-medium">
                {u.websiteUrl ? (
                  <a
                    className="underline"
                    href={u.websiteUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {u.websiteUrl}
                  </a>
                ) : (
                  t("pub.notStated")
                )}
              </dd>
              <dt className="text-muted-foreground">{t("pub.tracking")}</dt>
              <dd className="font-medium">
                {u.trackedPrograms > 0
                  ? t("pub.tracked", { n: u.trackedPrograms })
                  : t("pub.trackedNone")}
              </dd>
              <dt className="text-muted-foreground">{t("pub.lastVerified")}</dt>
              <dd className="font-medium">
                {u.verifiedOn
                  ? dateLabel(u.verifiedOn, lang)
                  : t("pub.notVerified")}
              </dd>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("pub.notWhole")}
            </p>
          </section>

          <Alert kind="info" title={t("pub.programsTitle")}>
            {t("pub.programsBody")}{" "}
            <Link
              href="/signup?next=%2Funiversities"
              className="font-semibold underline"
            >
              {t("auth.createProfile")}
            </Link>
          </Alert>
        </article>
      )}
    </div>
  );
}
