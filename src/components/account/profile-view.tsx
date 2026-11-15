"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/profile/avatar-uploader";
import { ReviewStep } from "@/components/profile/step-review";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { profileApi } from "@/lib/profile/api";
import type {
  Destinations,
  Options,
  StudentProfileView,
} from "@/lib/profile/types";
import { STEPS, validateStep, type Problems } from "@/lib/profile/validation";
import { useSession } from "./session-provider";

export type LoadedProfile = {
  view: StudentProfileView;
  options: Options;
  destinations: Destinations;
};

/** Reads the student's own profile (no editing here: every block links to the wizard step that edits it). */
export function useLoadedProfile(): {
  data: LoadedProfile | null;
  failed: boolean;
  reload: () => void;
} {
  const { expire } = useSession();
  const [data, setData] = useState<LoadedProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(() => {
    setFailed(false);
    Promise.all([
      profileApi.get(),
      profileApi.options(),
      profileApi.destinations(),
    ])
      .then(([view, options, destinations]) =>
        setData({ view, options, destinations }),
      )
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) expire();
        setFailed(true);
      });
  }, [expire]);
  useEffect(() => {
    // a one-time read of the server's answer
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { data, failed, reload };
}

export function ProfileView() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { state } = useSession();
  const { data, failed, reload } = useLoadedProfile();
  const user = state.status === "authenticated" ? state.user : null;

  if (failed) {
    return (
      <Alert kind="error" title={t("wizard.loadError")}>
        <Button type="button" variant="outline" size="sm" onClick={reload}>
          {t("common.tryAgain")}
        </Button>
      </Alert>
    );
  }
  if (!data) {
    return (
      <div role="status" aria-busy="true" className="grid gap-4">
        <span className="sr-only">{t("wizard.loading")}</span>
        <div aria-hidden className="h-28 animate-pulse rounded-xl bg-muted" />
        <div aria-hidden className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const { view, options, destinations } = data;
  const profile = view.profile;
  const completed = profile.onboarding.status === "COMPLETED";
  const ctx = { options, destinations };
  const incomplete: Problems = {};
  STEPS.slice(0, -1).forEach((s) =>
    Object.assign(incomplete, validateStep(s, profile, ctx)),
  );
  const resumeStep =
    Math.min(Math.max(profile.onboarding.step, 0), STEPS.length - 1) + 1;

  return (
    <div className="grid gap-6">
      {params.get("done") ? (
        <Alert kind="success" title={t("profile.doneTitle")}>
          {t("profile.doneBody")}
        </Alert>
      ) : null}

      <section className="flex flex-wrap items-center gap-5 card p-6">
        <Avatar
          present={view.avatar.present}
          version={view.avatar.version}
          name={user?.displayName ?? undefined}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold">
            {user?.displayName || user?.email}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {user?.email}
          </p>
          <p className="mt-2 text-sm font-medium">
            {completed ? t("profile.complete") : t("profile.incomplete")}
          </p>
        </div>
        <Button asChild>
          <Link href={`/profile/edit?step=${completed ? 1 : resumeStep}`}>
            {completed
              ? t("profile.edit")
              : profile.onboarding.status === "NOT_STARTED"
                ? t("profile.start")
                : t("profile.continue")}
          </Link>
        </Button>
      </section>

      {!completed ? (
        <Alert kind="info" title={t("profile.finishTitle")}>
          {t("profile.finishBody")}
        </Alert>
      ) : null}

      {view.legacy ? (
        <Alert kind="info" title={t("profile.legacyTitle")}>
          {t("profile.legacyBody")}
        </Alert>
      ) : null}

      <ReviewStep
        props={{
          draft: profile,
          update: () => {},
          options,
          destinations,
          problems: {},
        }}
        incomplete={completed ? {} : incomplete}
        hideReady={completed}
        onEdit={(step) =>
          router.push(`/profile/edit?step=${STEPS.indexOf(step) + 1}`)
        }
      />
    </div>
  );
}
