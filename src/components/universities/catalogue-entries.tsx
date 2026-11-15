"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { LoadingState } from "@/components/shared/loading-state";
import { DiscoveryExplorer } from "@/components/universities/discovery-explorer";
import { PublicUniversityDetail } from "@/components/universities/public-university-detail";
import { UniversityDetailView } from "@/components/universities/university-detail-view";
import { useT } from "@/lib/i18n";
import { CatalogueScopeProvider } from "@/lib/api/catalogue-scope";
import { useCatalogueMode } from "./catalogue-mode";

/** Shown once after a student first completes their profile (?welcome=1). */
function WelcomeNote() {
  const { t } = useT();
  if (useSearchParams().get("welcome") !== "1") return null;
  return (
    <div className="page-container pt-6">
      <Alert kind="success" title={t("pub.welcomeTitle")}>
        {t("pub.welcomeBody")}
      </Alert>
    </div>
  );
}

/** /universities: public discovery for visitors, the full program catalogue for accounts that have been given access. */
export function UniversitiesEntry() {
  const { t } = useT();
  const mode = useCatalogueMode();
  const note = (
    <Suspense fallback={null}>
      <WelcomeNote />
    </Suspense>
  );
  if (mode === "loading") return <LoadingState label={t("pub.loading")} />;
  return (
    <CatalogueScopeProvider value={mode === "public" ? "public" : "full"}>
      <Suspense
        fallback={
          <p className="min-h-[75vh] text-muted-foreground">
            {t("common.loading")}
          </p>
        }
      >
        {note}
        {mode === "public" ? (
          <div className="page-container pt-6">
            <Alert kind="info" title={t("pub.coverageTitle")}>
              {t("pub.coverageBody")}
            </Alert>
          </div>
        ) : null}
        <DiscoveryExplorer />
      </Suspense>
    </CatalogueScopeProvider>
  );
}

/** /universities/[slug]: the public page for visitors, the detailed protected page for accounts with access. */
export function UniversityDetailEntry() {
  const { t } = useT();
  const mode = useCatalogueMode();
  if (mode === "loading")
    return (
      <div className="page-container section-y">
        <LoadingState label={t("pub.loading")} />
      </div>
    );
  return mode === "public" ? (
    <PublicUniversityDetail />
  ) : (
    <UniversityDetailView />
  );
}
