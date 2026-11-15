"use client";

import Link from "next/link";
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

/** The API answers 401 (not signed in) or 403 (signed in, catalogue not open to this account) for the protected catalogue. */
export const isGateStatus = (status: number) =>
  status === 401 || status === 403;

/**
 * What a visitor sees where the catalogue would be while it is in protected beta. It is honest about why (the reuse terms of the
 * official data are being confirmed), never shows a fake or partial list, and offers the one useful next step.
 */
export function CatalogueProtected({ status }: { status: number }) {
  const { state } = useSession();
  const signedIn = state.status === "authenticated";
  return (
    <EmptyState
      title="The university catalogue is in a protected beta"
      description={
        signedIn
          ? "It is open only to invited accounts while we confirm the terms for reusing the official data. Your account is not on the list yet; your profile works as normal."
          : status === 401
            ? "It is open only to invited accounts while we confirm the terms for reusing the official data. Log in if you have been invited, or create your profile to be ready."
            : "It is open only to invited accounts while we confirm the terms for reusing the official data."
      }
    >
      <div className="flex flex-wrap gap-3">
        {signedIn ? (
          <Button asChild>
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/login?next=/universities">Log in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Create your profile</Link>
            </Button>
          </>
        )}
      </div>
    </EmptyState>
  );
}
