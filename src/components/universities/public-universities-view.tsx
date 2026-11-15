"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/components/account/session-provider";
import { LoadingState } from "@/components/shared/loading-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listPublicUniversities,
  type PublicUniversity,
  type PublicUniversityPage,
} from "@/lib/api/public-universities";
import { dateLabel, useT } from "@/lib/i18n";

export function PublicUniversityCard({ u }: { u: PublicUniversity }) {
  const { t, lang } = useT();
  return (
    <li className="relative flex h-full flex-col card p-5 transition-shadow duration-150 hover:shadow-md">
      <h3 className="text-lg font-bold">
        <Link
          href={`/universities/${u.slug}`}
          className="underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {u.name}
        </Link>
      </h3>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin aria-hidden className="size-4" />
        {[u.city, u.countryName].filter(Boolean).join(", ")}
      </p>
      <p className="mt-3 text-sm">
        {u.trackedPrograms > 0
          ? t("pub.tracked", { n: u.trackedPrograms })
          : t("pub.trackedNone")}
      </p>
      <p className="mt-auto pt-4 text-xs text-muted-foreground">
        {u.verifiedOn
          ? t("pub.verifiedOn", { date: dateLabel(u.verifiedOn, lang) })
          : t("pub.notVerified")}
      </p>
    </li>
  );
}

/** Public university discovery: real, synchronized institutions, no account needed. Nothing academic is shown here. */
export function PublicUniversitiesView() {
  const { t } = useT();
  const { state } = useSession();
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PublicUniversityPage | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect -- loading restarts with each new search or page */
    setError(false);
    setData(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    listPublicUniversities(q, page, 12, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setError(true);
      });
    return () => controller.abort();
  }, [q, page]);

  return (
    <div className="grid gap-6">
      <Alert kind="info" title={t("pub.coverageTitle")}>
        {t("pub.coverageBody")}
      </Alert>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQ(draft);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={t("pub.search")}
            placeholder={t("pub.search")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="pl-9"
            maxLength={100}
          />
        </div>
        <Button type="submit">{t("pub.searchButton")}</Button>
      </form>

      {error ? (
        <Alert kind="error" title={t("pub.errorTitle")}>
          {t("pub.errorBody")}
        </Alert>
      ) : data === null ? (
        <LoadingState label={t("pub.loading")} />
      ) : data.content.length === 0 ? (
        <div className="card p-6">
          <h2 className="text-lg font-bold">{t("pub.emptyTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("pub.emptyBody")}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            {t("pub.count", { n: data.totalElements })}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.content.map((u) => (
              <PublicUniversityCard key={u.slug} u={u} />
            ))}
          </ul>
          {data.totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("pub.prev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("pub.pageOf", { n: page + 1, total: data.totalPages })}
              </span>
              <Button
                variant="outline"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("pub.next")}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <section
        className="flex flex-col gap-3 card p-6 sm:flex-row sm:items-center sm:justify-between"
        aria-labelledby="pub-account"
      >
        <div>
          <h2 id="pub-account" className="text-lg font-bold">
            {t("pub.accountTitle")}
          </h2>
          <p className="mt-1 max-w-xl text-muted-foreground">
            {t("pub.accountBody")}
          </p>
        </div>
        {state.status === "authenticated" ? (
          <Button asChild variant="outline">
            <Link href="/profile">
              {t("nav.profile")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/signup?next=%2Funiversities">
              {t("auth.createProfile")}
            </Link>
          </Button>
        )}
      </section>
      <p className="text-xs text-muted-foreground">{t("pub.sourceNote")}</p>
    </div>
  );
}
