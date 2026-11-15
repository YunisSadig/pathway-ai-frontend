"use client";

import { Alert } from "@/components/ui/alert";
import { useT, type Key } from "@/lib/i18n";
import type { Account } from "@/lib/account/types";
import { useRequireSession } from "./session-provider";

function Frame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-container section-y">
      <header className="max-w-2xl">
        <h1 className="title-page">{title}</h1>
        {description ? (
          <p className="mt-2 text-lg text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}

/**
 * The frame of every signed-in page. It waits for the session (a skeleton, never a flash of someone's data), sends a visitor without a
 * session to the login page, and says so honestly when the service cannot be reached. The server authorizes every API call regardless.
 */
export function PrivatePage({
  titleKey,
  descriptionKey,
  children,
}: {
  titleKey: Key;
  descriptionKey?: Key;
  children: (user: Account) => React.ReactNode;
}) {
  const { t } = useT();
  const state = useRequireSession();

  if (state.status === "authenticated") {
    return (
      <Frame
        title={t(titleKey)}
        description={descriptionKey ? t(descriptionKey) : undefined}
      >
        {children(state.user)}
      </Frame>
    );
  }

  return (
    <div className="page-container min-h-[60svh] section-y">
      {state.status === "anonymous" && state.serviceError ? (
        <Alert kind="error" title={t("private.serviceTitle")}>
          {t("private.serviceBody")}
        </Alert>
      ) : (
        <div role="status" aria-busy="true" className="grid max-w-2xl gap-4">
          <span className="sr-only">{t("private.loading")}</span>
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

/** A page that works for everyone (Settings: appearance and language need no account). */
export function OpenPage({
  titleKey,
  descriptionKey,
  children,
}: {
  titleKey: Key;
  descriptionKey?: Key;
  children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <Frame
      title={t(titleKey)}
      description={descriptionKey ? t(descriptionKey) : undefined}
    >
      {children}
    </Frame>
  );
}
