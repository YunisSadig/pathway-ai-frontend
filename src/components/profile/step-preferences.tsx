"use client";

import { useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { countryName, currencyLabel, useT, type Key } from "@/lib/i18n";
import type {
  BudgetStatus,
  IntakeSeason,
  TargetLevel,
} from "@/lib/profile/types";
import {
  SectionCard,
  enumKey,
  useProblemText,
  yearOptions,
  type StepProps,
} from "./shared";

const SEASONS: IntakeSeason[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
/** Regions on the roadmap. They are information only: no program records exist there yet, so they are not controls. */
const COMING_SOON = ["EU", "US", "CA", "JP", "CN", "KR"] as const;

function Destinations({ props }: { props: StepProps }) {
  const { t, lang } = useT();
  const { draft, update, destinations, problems } = props;
  const err = useProblemText(problems);
  const toggle = (
    list: "destinations" | "preferredUniversities",
    value: string,
  ) =>
    update((d) => ({
      ...d,
      [list]: d[list].includes(value)
        ? d[list].filter((v) => v !== value)
        : [...d[list], value],
      // leaving a country also drops the universities that belonged to it
      ...(list === "destinations" && d.destinations.includes(value)
        ? {
            preferredUniversities: d.preferredUniversities.filter(
              (slug) =>
                destinations.universities.find((u) => u.slug === slug)
                  ?.countryCode !== value,
            ),
          }
        : {}),
    }));
  const universities = destinations.universities.filter((u) =>
    draft.destinations.includes(u.countryCode),
  );

  const check = (
    list: "destinations" | "preferredUniversities",
    value: string,
    label: string,
  ) => (
    <label
      key={value}
      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border-strong bg-surface px-3.5 text-sm font-medium transition-colors hover:bg-hover has-[:checked]:border-primary has-[:checked]:bg-selected has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
    >
      <input
        type="checkbox"
        checked={draft[list].includes(value)}
        onChange={() => toggle(list, value)}
        className="size-5 cursor-pointer accent-[var(--primary)]"
      />
      {label}
    </label>
  );

  return (
    <SectionCard
      title={t("pref.destinations")}
      description={t("pref.destinationsHelp")}
    >
      {destinations.restricted ? (
        <Alert kind="info" title={t("pref.restrictedTitle")}>
          {t("pref.restrictedBody")}
        </Alert>
      ) : destinations.countries.length === 0 ? (
        <Alert kind="info">{t("pref.noneOpen")}</Alert>
      ) : (
        <>
          <fieldset className="grid gap-2.5">
            <legend className="mb-1 text-sm font-semibold">
              {t("pref.chooseCountries")}
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {destinations.countries.map((c) =>
                check("destinations", c.code, countryName(c.code, lang)),
              )}
            </div>
            {err("destinations") ? (
              <p className="text-sm font-medium text-danger">
                <span className="sr-only">{t("common.error")}: </span>
                {err("destinations")}
              </p>
            ) : null}
          </fieldset>
          {universities.length ? (
            <fieldset className="grid gap-2.5">
              <legend className="mb-1 text-sm font-semibold">
                {t("pref.chooseUniversities")}
              </legend>
              <p className="text-sm text-muted-foreground">
                {t("pref.universitiesHelp")}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {universities.map((u) =>
                  check("preferredUniversities", u.slug, u.name),
                )}
              </div>
            </fieldset>
          ) : null}
        </>
      )}
      <div className="grid gap-2">
        <p className="text-sm font-semibold">{t("pref.comingSoon")}</p>
        <ul className="flex flex-wrap gap-2" aria-label={t("pref.comingSoon")}>
          {COMING_SOON.map((r) => (
            <li
              key={r}
              className="cursor-default rounded-full border border-dashed border-border-strong px-3 py-1 text-sm text-muted-foreground"
            >
              {t(enumKey("region", r))}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {t("pref.comingSoonHelp")}
        </p>
      </div>
    </SectionCard>
  );
}

function BudgetSection({ props }: { props: StepProps }) {
  const { t, lang } = useT();
  const { draft, update, options, problems } = props;
  const err = useProblemText(problems);
  const budget = draft.budget ?? { status: null, amount: null, currency: null };
  const local =
    options.countries.find((c) => c.code === draft.residence)
      ?.defaultCurrency ??
    options.countries.find((c) => c.code === draft.citizenship)
      ?.defaultCurrency ??
    null;
  const setBudget = (patch: Partial<typeof budget>) =>
    update((d) => ({ ...d, budget: { ...(d.budget ?? budget), ...patch } }));

  // the student's own currency first, then the common ones, then the rest in the configured order
  const ordered = useMemo(() => {
    const first = [local, ...options.commonCurrencies].filter(
      (c): c is string => !!c,
    );
    return [...new Set([...first, ...options.currencies])];
  }, [local, options.commonCurrencies, options.currencies]);
  const currencyOptions = ordered.map((code) => ({
    value: code,
    label: `${code} — ${currencyLabel(code, lang)}`,
    keywords: code,
  }));

  return (
    <SectionCard title={t("budget.title")} description={t("budget.help")}>
      <ChoiceGroup<BudgetStatus>
        name="budgetStatus"
        label={t("budget.question")}
        value={budget.status}
        error={err("budget.status")}
        columns={2}
        onChange={(status) =>
          status === "AMOUNT"
            ? setBudget({ status, currency: budget.currency ?? local })
            : setBudget({ status, amount: null, currency: null })
        }
        choices={[
          { value: "AMOUNT", label: t("budget.haveBudget") },
          {
            value: "NOT_SURE",
            label: t("budget.notSure"),
            description: t("budget.notSureHelp"),
          },
        ]}
      />
      {budget.status === "AMOUNT" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="budgetAmount"
            label={t("budget.amount")}
            hint={t("budget.amountHint")}
            error={err("budget.amount")}
          >
            {(p) => (
              <NumberInput
                {...p}
                value={budget.amount}
                onValueChange={(amount) => setBudget({ amount })}
              />
            )}
          </Field>
          <Field
            id="budgetCurrency"
            label={t("budget.currency")}
            hint={t("budget.currencyHint")}
            error={err("budget.currency")}
          >
            {(p) => (
              <Combobox
                {...p}
                options={currencyOptions}
                value={budget.currency}
                placeholder={t("budget.currencyPlaceholder")}
                emptyText={t("common.noMatches")}
                onChange={(currency) => setBudget({ currency })}
              />
            )}
          </Field>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {t("budget.noConversion")}
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}

/** Step 5: what the student is aiming for. Destinations come from the live catalogue only; nothing unavailable can be picked. */
export function PreferencesStep(props: StepProps) {
  const { t } = useT();
  const { draft, update, problems } = props;
  const err = useProblemText(problems);
  const thisYear = new Date().getFullYear();
  return (
    <div className="grid gap-6">
      <SectionCard title={t("pref.target")} description={t("pref.targetHelp")}>
        <ChoiceGroup<TargetLevel>
          name="targetDegreeLevel"
          label={t("pref.targetLabel")}
          value={draft.targetDegreeLevel}
          error={err("targetDegreeLevel")}
          columns={2}
          onChange={(value) =>
            update((d) => ({ ...d, targetDegreeLevel: value }))
          }
          choices={(["BACHELOR", "MASTER"] as const).map((l) => ({
            value: l,
            label: t(enumKey("qualification", l)),
          }))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="intakeSeason" label={t("pref.intakeSeason")} optional>
            {(p) => (
              <Select
                {...p}
                value={draft.intakeSeason ?? ""}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    intakeSeason: (e.target.value ||
                      null) as IntakeSeason | null,
                  }))
                }
              >
                <option value="">{t("common.choose")}</option>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`enum.season.${s}` as Key)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="intakeYear"
            label={t("pref.intakeYear")}
            optional
            error={err("intakeYear")}
          >
            {(p) => (
              <Select
                {...p}
                value={draft.intakeYear ?? ""}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    intakeYear: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">{t("common.choose")}</option>
                {yearOptions(thisYear, thisYear + 4).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </SectionCard>
      <Destinations props={props} />
      <BudgetSection props={props} />
    </div>
  );
}
