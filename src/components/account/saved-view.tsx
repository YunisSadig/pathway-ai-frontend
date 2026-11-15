"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/components/saved/saved-provider";
import { useErrorText } from "@/lib/account/errors";
import type { Account } from "@/lib/account/types";
import { useT } from "@/lib/i18n";

export function SavedView({ user }: { user: Account }) {
  const { t } = useT();
  const { describe } = useErrorText();
  const { items, ready, error, toggleProgram, toggleUniversity } = useSaved();
  const [problem, setProblem] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setProblem(null);
    try {
      await action();
    } catch (e) {
      setProblem(describe(e));
    }
  }

  if (
    !user.catalogueAccess &&
    !items.catalogueVisible &&
    ready &&
    items.universities.length === 0
  ) {
    return (
      <Alert kind="info" title={t("saved.protectedTitle")}>
        {t("saved.protectedBody")}{" "}
        <Link href="/profile" className="font-semibold underline">
          {t("saved.protectedLink")}
        </Link>
      </Alert>
    );
  }
  if (!ready) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="h-48 animate-pulse rounded-xl bg-muted"
      >
        <span className="sr-only">{t("saved.loading")}</span>
      </div>
    );
  }
  if (error)
    return (
      <Alert kind="error" title={t("saved.loadError")}>
        {t("err.generic")}
      </Alert>
    );

  const empty = items.programs.length === 0 && items.universities.length === 0;
  return (
    <div className="grid gap-6">
      {problem ? <Alert kind="error">{problem}</Alert> : null}
      {empty ? (
        <div className="card p-6">
          <h2 className="text-lg font-bold">{t("saved.emptyTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("saved.emptyBody")}</p>
          <Button asChild className="mt-4">
            <Link href="/universities">{t("dash.explore")}</Link>
          </Button>
        </div>
      ) : null}

      {items.programs.length > 0 ? (
        <section aria-labelledby="saved-programs" className="card p-6">
          <h2 id="saved-programs" className="text-lg font-bold">
            {t("saved.programs")}
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {items.programs.map((p) => (
              <li
                key={p.identifier}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  {p.available ? (
                    <Link
                      href={`/programs/${p.identifier}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      {t("saved.programGone")}
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {p.available
                      ? p.universityName
                      : t("saved.programGoneHelp")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run(() => toggleProgram(p.identifier))}
                >
                  {t("common.remove")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {items.universities.length > 0 ? (
        <section aria-labelledby="saved-universities" className="card p-6">
          <h2 id="saved-universities" className="text-lg font-bold">
            {t("saved.universities")}
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {items.universities.map((u) => (
              <li
                key={u.slug}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  {u.available ? (
                    <Link
                      href={`/universities/${u.slug}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {u.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      {t("saved.universityGone")}
                    </span>
                  )}
                  {u.available && u.countryName ? (
                    <p className="text-sm text-muted-foreground">
                      {u.countryName}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run(() => toggleUniversity(u.slug))}
                >
                  {t("common.remove")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
