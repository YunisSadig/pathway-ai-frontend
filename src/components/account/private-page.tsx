"use client";

import type { Account } from "@/lib/account/types";
import { Alert } from "@/components/ui/alert";
import { useRequireSession } from "./session-provider";

/**
 * The frame of every signed-in page. It waits for the session (a skeleton, never a flash of someone's data), sends a visitor without a
 * session to the login page, and says so honestly when the service cannot be reached. The server authorizes every API call regardless.
 */
export function PrivatePage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: (user: Account) => React.ReactNode;
}) {
  const state = useRequireSession();

  if (state.status === "authenticated") {
    return (
      <div className="page-container section-y">
        <header className="max-w-2xl">
          <h1 className="title-page">{title}</h1>
          {description ? (
            <p className="mt-2 text-lg text-muted-foreground">{description}</p>
          ) : null}
        </header>
        <div className="mt-8">{children(state.user)}</div>
      </div>
    );
  }

  return (
    <div className="page-container min-h-[60svh] section-y">
      {state.status === "anonymous" && state.serviceError ? (
        <Alert kind="error" title="We could not reach the service">
          Your account is safe. Please check your connection and reload the
          page; if the service was idle it can take up to two minutes to wake
          up.
        </Alert>
      ) : (
        <div role="status" aria-busy="true" className="grid max-w-2xl gap-4">
          <span className="sr-only">Loading your account…</span>
          <div
            aria-hidden
            className="h-10 w-2/3 animate-pulse rounded-lg bg-muted"
          />
          <div aria-hidden className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      )}
    </div>
  );
}
