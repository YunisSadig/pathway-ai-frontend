"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Bookmark, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/profile/avatar-uploader";
import { useSaved } from "@/components/saved/saved-provider";
import type { Account } from "@/lib/account/types";
import { useT, type Key } from "@/lib/i18n";
import { STEPS } from "@/lib/profile/validation";
import { useLoadedProfile } from "./profile-view";

export function DashboardView({ user }: { user: Account }) {
  const { t } = useT();
  const params = useSearchParams();
  const { data, failed } = useLoadedProfile();
  const { items, ready } = useSaved();
  const first = user.displayName?.split(" ")[0];
  const status = data?.view.profile.onboarding.status ?? null;
  const step =
    Math.min(
      Math.max(data?.view.profile.onboarding.step ?? 0, 0),
      STEPS.length - 1,
    ) + 1;
  const missing = data?.view.completeness.missing.length ?? 0;

  return (
    <div className="grid gap-6">
      {params.get("welcome") ? (
        <Alert
          kind="success"
          title={
            first ? t("dash.welcomeNamed", { name: first }) : t("dash.welcome")
          }
        >
          {t("dash.welcomeBody")}
        </Alert>
      ) : null}
      {!user.emailVerified ? (
        <Alert kind="info" title={t("dash.emailTitle")}>
          {t("dash.emailBody")}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <section
          aria-labelledby="profile-title"
          className="flex h-full flex-col card p-6 lg:col-span-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="profile-title" className="text-lg font-bold">
                {t("dash.profile")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {failed
                  ? t("dash.profileUnavailable")
                  : status === null
                    ? t("common.loading")
                    : status === "COMPLETED"
                      ? t("dash.profileComplete")
                      : status === "NOT_STARTED"
                        ? t("dash.profileNotStarted")
                        : t("dash.profileInProgress")}
              </p>
            </div>
            {data ? (
              <Avatar
                present={data.view.avatar.present}
                version={data.view.avatar.version}
                name={user.displayName ?? undefined}
                className="size-14"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground"
              >
                <UserRound className="size-5" />
              </span>
            )}
          </div>
          {status && status !== "COMPLETED" ? (
            <div
              role="progressbar"
              aria-label={t("dash.progress")}
              aria-valuemin={0}
              aria-valuemax={STEPS.length}
              aria-valuenow={step - 1}
              className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${((step - 1) / STEPS.length) * 100}%` }}
              />
            </div>
          ) : null}
          {status && status !== "COMPLETED" && missing > 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("dash.missing", { n: missing })}
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-3 pt-6">
            <Button asChild>
              <Link
                href={`/profile/edit?step=${status === "COMPLETED" ? 1 : step}`}
              >
                {status === "COMPLETED"
                  ? t("profile.edit")
                  : status === "NOT_STARTED" || status === null
                    ? t("profile.start")
                    : t("profile.continue")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile">{t("dash.viewProfile")}</Link>
            </Button>
          </div>
        </section>

        <section
          aria-labelledby="saved-title"
          className="flex h-full flex-col card p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="saved-title" className="text-lg font-bold">
              {t("dash.saved")}
            </h2>
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground"
            >
              <Bookmark className="size-5" />
            </span>
          </div>
          {user.catalogueAccess ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {ready
                ? t("dash.savedCounts", {
                    programs: items.programs.length,
                    universities: items.universities.length,
                  })
                : t("common.loading")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dash.savedProtected")}
            </p>
          )}
          <Button asChild variant="outline" className="mt-auto self-start">
            <Link href="/saved">{t("dash.openSaved")}</Link>
          </Button>
        </section>
      </div>

      <section aria-labelledby="status-title" className="card p-6">
        <h2 id="status-title" className="text-lg font-bold">
          {t("dash.available")}
        </h2>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {(
            [
              ["dash.row.profile", "verified", "dash.badge.available"],
              [
                "dash.row.discovery",
                user.catalogueAccess ? "verified" : "hypothetical",
                user.catalogueAccess
                  ? "dash.badge.availableToYou"
                  : "dash.badge.beta",
              ],
              ["dash.row.scholarships", "neutral", "dash.badge.soon"],
              ["dash.row.matching", "neutral", "dash.badge.soon"],
            ] as [Key, "verified" | "hypothetical" | "neutral", Key][]
          ).map(([name, tone, label]) => (
            <li
              key={name}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <span className="font-medium">{t(name)}</span>
              <StatusBadge status={tone}>{t(label)}</StatusBadge>
            </li>
          ))}
        </ul>
        {user.catalogueAccess ? (
          <Button asChild variant="link" size="link" className="mt-3">
            <Link href="/universities">
              {t("dash.explore")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : null}
      </section>
    </div>
  );
}
