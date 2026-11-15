"use client";

import { Suspense } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { DiscoveryExplorer } from "@/components/universities/discovery-explorer";
import { PublicUniversitiesView } from "@/components/universities/public-universities-view";
import { PublicUniversityDetail } from "@/components/universities/public-university-detail";
import { UniversityDetailView } from "@/components/universities/university-detail-view";
import { useT } from "@/lib/i18n";
import { useCatalogueMode } from "./catalogue-mode";

/** /universities: public discovery for visitors, the full program catalogue for accounts that have been given access. */
export function UniversitiesEntry() {
  const { t } = useT();
  const mode = useCatalogueMode();
  if (mode === "loading") return <LoadingState label={t("pub.loading")} />;
  if (mode === "public") return <PublicUniversitiesView />;
  return (
    <Suspense
      fallback={
        <p className="min-h-[75vh] text-muted-foreground">
          {t("common.loading")}
        </p>
      }
    >
      <DiscoveryExplorer />
    </Suspense>
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
