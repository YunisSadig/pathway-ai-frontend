"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPublicUniversity,
  type PublicUniversity,
} from "@/lib/api/public-universities";
import { useT } from "@/lib/i18n";

/** The API answers 401 (not signed in) or 403 (signed in, catalogue not open to this account) for the protected catalogue. */
export const isGateStatus = (status: number) =>
  status === 401 || status === 403;

/**
 * What a visitor sees where the catalogue would be while it is in protected beta. It is honest about why (the reuse terms of the
 * official data are being confirmed), never shows a fake or partial list, and offers the one useful next step.
 */
export function CatalogueProtected({
  status,
  universitySlug,
}: {
  status: number;
  universitySlug?: string;
}) {
  const { t } = useT();
  const [uni, setUni] = useState<PublicUniversity | null>(null);
  useEffect(() => {
    if (!universitySlug) return;
    const c = new AbortController();
    getPublicUniversity(universitySlug, c.signal)
      .then(setUni)
      .catch(() => undefined); // the links are a courtesy; the explanation stands without them
    return () => c.abort();
  }, [universitySlug]);
  const { state } = useSession();
  const signedIn = state.status === "authenticated";
  return (
    <EmptyState
      title={t("catalogue.title")}
      description={
        signedIn
          ? t("catalogue.signedIn")
          : status === 401
            ? t("catalogue.anonymous")
            : t("catalogue.generic")
      }
    >
      <div className="flex flex-wrap gap-3">
        {universitySlug ? (
          <Button asChild variant="outline">
            <Link href={`/universities/${encodeURIComponent(universitySlug)}`}>
              {uni
                ? t("catalogue.viewUniversity", { name: uni.name })
                : t("catalogue.viewUniversityGeneric")}
            </Link>
          </Button>
        ) : null}
        {uni?.websiteUrl ? (
          <Button asChild variant="outline">
            <a href={uni.websiteUrl} rel="noopener noreferrer" target="_blank">
              {t("pub.official")}
            </a>
          </Button>
        ) : null}
        {signedIn ? (
          <Button asChild>
            <Link href="/dashboard">{t("catalogue.toDashboard")}</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link
                href={`/login?next=${encodeURIComponent(universitySlug ? `/universities/${universitySlug}` : "/universities")}`}
              >
                {t("auth.login")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">{t("auth.createProfile")}</Link>
            </Button>
          </>
        )}
      </div>
    </EmptyState>
  );
}
