"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useProfileDraft } from "@/lib/profile/use-profile-draft";
import {
  STEPS,
  firstIncompleteStep,
  validateStep,
  type Problems,
  type StepName,
} from "@/lib/profile/validation";
import { BackgroundStep } from "./step-background";
import { EducationStep } from "./step-education";
import { ExperienceStep } from "./step-experience";
import { GradesStep } from "./step-grades";
import { PreferencesStep } from "./step-preferences";
import { ReviewStep } from "./step-review";
import type { StepProps } from "./shared";

function stepFromParam(value: string | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= STEPS.length ? n - 1 : null;
}

/**
 * The guided profile: six short steps instead of one long form. Every change is saved as a draft, the student can leave and resume where
 * they stopped, each step is checked before moving on, and a finished profile can be edited again step by step.
 */
export function ProfileWizard() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const d = useProfileDraft();
  const [step, setStep] = useState<number | null>(null);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [finishProblems, setFinishProblems] = useState<Problems>({});
  const [finishing, setFinishing] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const ready = d.load.status === "ready" && d.options && d.destinations;
  const completed = d.view?.profile.onboarding.status === "COMPLETED";
  const ctx = useMemo(
    () =>
      d.options && d.destinations
        ? { options: d.options, destinations: d.destinations }
        : null,
    [d.options, d.destinations],
  );

  // choose the starting step once the profile is loaded: ?step= wins, otherwise resume where the student stopped
  const initial = useMemo(() => {
    if (!ready) return null;
    const fromUrl = stepFromParam(params.get("step"));
    if (fromUrl !== null) return fromUrl;
    return Math.min(d.view?.profile.onboarding.step ?? 0, STEPS.length - 1);
  }, [ready, params, d.view]);
  const current = step ?? initial ?? 0;

  useEffect(() => {
    document.title = `${t("wizard.pageTitle")} · Pathway AI`;
  }, [t]);

  if (d.load.status === "loading" || !ready || !ctx) {
    return d.load.status === "error" ? (
      <Alert kind="error" title={t("wizard.loadError")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void d.reload()}
        >
          {t("common.tryAgain")}
        </Button>
      </Alert>
    ) : (
      <div role="status" aria-busy="true" className="grid gap-4">
        <span className="sr-only">{t("wizard.loading")}</span>
        <div aria-hidden className="h-16 animate-pulse rounded-xl bg-muted" />
        <div aria-hidden className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const name: StepName = STEPS[current];
  const stepProblems: Problems = attempted[current]
    ? validateStep(name, d.draft, ctx)
    : {};
  const problems: Problems = {
    ...d.serverProblems,
    ...stepProblems,
    ...(name === "review" ? finishProblems : {}),
  };
  const reviewIncomplete: Problems = {};
  STEPS.slice(0, -1).forEach((s) =>
    Object.assign(reviewIncomplete, validateStep(s, d.draft, ctx)),
  );

  const stepProps: StepProps = {
    draft: d.draft,
    update: d.update,
    options: d.options as NonNullable<typeof d.options>,
    destinations: d.destinations as NonNullable<typeof d.destinations>,
    problems,
  };

  function goTo(index: number) {
    setStep(index);
    d.update((p) => ({
      ...p,
      onboarding: {
        status:
          p.onboarding.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        step: index,
      },
    }));
    void d.flush(); // the position is saved at once, so leaving now still resumes here
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(index + 1));
    window.history.replaceState(null, "", url);
    requestAnimationFrame(() =>
      top.current?.scrollIntoView({ block: "start" }),
    );
  }

  function focusFirstProblem() {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        "main [aria-invalid='true'], main [role='alert']",
      );
      el?.scrollIntoView({ block: "center" });
      el?.focus?.();
    });
  }

  async function next() {
    setAttempted((a) => ({ ...a, [current]: true }));
    if (
      Object.keys(validateStep(name, d.draft, ctx as NonNullable<typeof ctx>))
        .length
    )
      return focusFirstProblem();
    if (!(await d.flush())) return focusFirstProblem();
    goTo(current + 1);
  }

  async function finish() {
    setFinishing(true);
    setFinishProblems({});
    const result = await d.complete();
    setFinishing(false);
    if (result.ok) return router.push("/profile?done=1");
    setFinishProblems(result.problems);
    const first = firstIncompleteStep(d.draft, ctx as NonNullable<typeof ctx>);
    if (first >= 0) {
      setAttempted((a) => ({ ...a, [first]: true }));
      goTo(first);
    }
  }

  async function saveAndExit() {
    if (await d.flush()) router.push("/profile");
  }

  const saveText =
    d.saveState === "saving"
      ? t("wizard.saving")
      : d.saveState === "saved"
        ? t("wizard.saved")
        : d.saveState === "error"
          ? t("wizard.saveError")
          : completed
            ? ""
            : t("wizard.autosave");

  return (
    <div ref={top} className="grid gap-6">
      <nav aria-label={t("wizard.progress")}>
        <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {STEPS.map((s, i) => {
            const done = i < current || (completed && i !== current);
            const reachable = completed || i <= current;
            return (
              <li key={s} className="min-w-0">
                <button
                  type="button"
                  disabled={!reachable}
                  aria-current={i === current ? "step" : undefined}
                  onClick={() =>
                    reachable &&
                    i !== current &&
                    void d.flush().then(() => goTo(i))
                  }
                  className="group grid w-full gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed"
                >
                  <span
                    aria-hidden
                    className={`h-1.5 rounded-full transition-colors ${i === current ? "bg-primary" : done ? "bg-primary/60" : "bg-border-strong"}`}
                  />
                  <span className="hidden min-w-0 items-center gap-1.5 overflow-hidden text-xs font-semibold sm:flex">
                    <span
                      aria-hidden
                      className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] ${i === current ? "bg-primary text-primary-foreground" : done ? "bg-primary-soft text-primary-soft-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {done ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span
                      title={t(`step.${s}`)}
                      className={`min-w-0 truncate ${i === current ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {t(`step.${s}`)}
                    </span>
                  </span>
                  <span className="sr-only sm:hidden">
                    {t("wizard.stepOf", { n: i + 1, total: STEPS.length })}:{" "}
                    {t(`step.${s}`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm font-semibold sm:hidden" aria-hidden>
          {t("wizard.stepOf", { n: current + 1, total: STEPS.length })} ·{" "}
          {t(`step.${name}`)}
        </p>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t(`step.${name}`)}
        </h2>
        <p className="mt-1 text-muted-foreground">{t(`step.${name}Help`)}</p>
      </div>

      <p className="-mt-3 text-sm text-muted-foreground">
        {t("wizard.requiredNote")}
      </p>

      {Object.keys(stepProblems).length ? (
        <Alert kind="error" title={t("wizard.fixTitle")}>
          {t("wizard.fixBody")}
        </Alert>
      ) : null}

      {name === "background" ? (
        <BackgroundStep
          {...stepProps}
          avatar={d.view?.avatar ?? { present: false, version: 0 }}
          onAvatar={d.refreshAvatar}
        />
      ) : null}
      {name === "education" ? <EducationStep {...stepProps} /> : null}
      {name === "grades" ? (
        <GradesStep {...stepProps} legacy={d.view?.legacy ?? null} />
      ) : null}
      {name === "experience" ? <ExperienceStep {...stepProps} /> : null}
      {name === "preferences" ? <PreferencesStep {...stepProps} /> : null}
      {name === "review" ? (
        <ReviewStep
          props={stepProps}
          incomplete={reviewIncomplete}
          onEdit={(s) => goTo(STEPS.indexOf(s))}
        />
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex items-center gap-2">
          {current > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void d.flush().then(() => goTo(current - 1))}
            >
              <ArrowLeft aria-hidden />
              {t("wizard.back")}
            </Button>
          ) : null}
          <p
            role="status"
            aria-live="polite"
            className={`text-sm ${d.saveState === "error" ? "font-medium text-danger" : "hidden text-muted-foreground sm:block"}`}
          >
            {saveText}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {completed ? (
            <Button type="button" variant="outline" onClick={saveAndExit}>
              {t("wizard.saveExit")}
            </Button>
          ) : null}
          {name === "review" ? (
            <Button
              type="button"
              size="lg"
              disabled={finishing}
              onClick={finish}
            >
              {finishing
                ? t("common.saving")
                : completed
                  ? t("wizard.saveChanges")
                  : t("wizard.finish")}
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={next}>
              {t("wizard.continue")}
              <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
