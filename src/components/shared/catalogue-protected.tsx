"use client";

import Link from "next/link";
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useT } from "@/lib/i18n";

/** The API answers 401 (not signed in) or 403 (signed in, catalogue not open to this account) for the protected catalogue. */
export const isGateStatus = (status: number) =>
  status === 401 || status === 403;

/**
 * What a visitor sees where the catalogue would be while it is in protected beta. It is honest about why (the reuse terms of the
 * official data are being confirmed), never shows a fake or partial list, and offers the one useful next step.
 */
export function CatalogueProtected({ status }: { status: number }) {
  const { t } = useT();
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
        {signedIn ? (
          <Button asChild>
            <Link href="/dashboard">{t("catalogue.toDashboard")}</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/login?next=/universities">{t("auth.login")}</Link>
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
