"use client";

import { useMemo } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { countryName, useT, type Key } from "@/lib/i18n";
import {
  EMPTY_EDUCATION,
  type EducationStatus,
  type Qualification,
  type Stage,
  type StudyArea,
} from "@/lib/profile/types";
import { isCurrentStage, relevantStages } from "@/lib/profile/validation";
import {
  SectionCard,
  enumKey,
  useProblemText,
  yearOptions,
  type StepProps,
} from "./shared";

const STATUSES: EducationStatus[] = [
  "HIGH_SCHOOL",
  "BACHELOR",
  "MASTER",
  "GRADUATED",
];

function StageForm({
  stage,
  title,
  props,
}: {
  stage: Stage;
  title: string;
  props: StepProps;
}) {
  const { t, lang } = useT();
  const { draft, update, options, problems } = props;
  const err = useProblemText(problems);
  const current = isCurrentStage(draft, stage);
  const value = draft[stage] ?? EMPTY_EDUCATION;
  const thisYear = new Date().getFullYear();

  const countries = useMemo(
    () =>
      options.countries
        .map((c) => ({
          value: c.code,
          label: countryName(c.code, lang),
          keywords: c.code,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, lang)),
    [options.countries, lang],
  );
  const set = (patch: Partial<typeof value>) =>
    update((d) => ({
      ...d,
      [stage]: { ...(d[stage] ?? EMPTY_EDUCATION), ...patch },
    }));

  const maxYear = stage === "school" ? 12 : stage === "bachelor" ? 6 : 3;
  const graduationYears = current
    ? yearOptions(thisYear, thisYear + 9)
    : yearOptions(thisYear - 40, thisYear + 1).reverse();

  return (
    <SectionCard title={title} description={t(`edu.help.${stage}` as Key)}>
      <Field
        id={`${stage}-institution`}
        label={t(stage === "school" ? "edu.schoolName" : "edu.universityName")}
        hint={t("edu.institutionHint")}
        error={err(`${stage}.institution`)}
      >
        {(p) => (
          <Input
            {...p}
            maxLength={160}
            autoComplete="off"
            value={value.institution ?? ""}
            onChange={(e) => set({ institution: e.target.value })}
          />
        )}
      </Field>
      <Field
        id={`${stage}-country`}
        label={t("edu.country")}
        hint={t("edu.countryHint")}
        error={err(`${stage}.country`)}
      >
        {(p) => (
          <Combobox
            {...p}
            options={countries}
            value={value.country}
            placeholder={t("bg.countryPlaceholder")}
            emptyText={t("common.noMatches")}
            onChange={(code) => set({ country: code })}
          />
        )}
      </Field>
      {stage !== "school" ? (
        <Field
          id={`${stage}-program`}
          label={t(
            stage === "master" ? "edu.masterProgram" : "edu.bachelorProgram",
          )}
          hint={t("edu.programHint")}
          error={err(`${stage}.program`)}
        >
          {(p) => (
            <Input
              {...p}
              maxLength={160}
              autoComplete="off"
              value={value.program ?? ""}
              onChange={(e) => set({ program: e.target.value })}
            />
          )}
        </Field>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        {current ? (
          <Field
            id={`${stage}-year`}
            label={t(
              stage === "school" ? "edu.currentGrade" : "edu.currentYear",
            )}
            error={err(`${stage}.currentYear`)}
          >
            {(p) => (
              <Select
                {...p}
                value={value.currentYear ?? ""}
                onChange={(e) =>
                  set({
                    currentYear: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">{t("common.choose")}</option>
                {yearOptions(1, maxYear).map((n) => (
                  <option key={n} value={n}>
                    {t(stage === "school" ? "edu.gradeN" : "edu.yearN", { n })}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
        <Field
          id={`${stage}-graduation`}
          label={t(current ? "edu.expectedGraduation" : "edu.graduationYear")}
          error={err(`${stage}.graduationYear`)}
        >
          {(p) => (
            <Select
              {...p}
              value={value.graduationYear ?? ""}
              onChange={(e) =>
                set({
                  graduationYear: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            >
              <option value="">{t("common.choose")}</option>
              {graduationYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

/** Step 2: where the student is in their education. The questions below the first answer change with it; nothing irrelevant is shown. */
export function EducationStep(props: StepProps) {
  const { t } = useT();
  const { draft, update, options, problems } = props;
  const err = useProblemText(problems);
  const stages = relevantStages(draft);

  const titleFor = (stage: Stage): string => {
    if (draft.educationStatus === "MASTER" && stage === "bachelor")
      return t("edu.stage.priorBachelor");
    if (draft.educationStatus === "GRADUATED") return t("edu.stage.completed");
    return t(`edu.stage.${stage}` as Key);
  };

  const specializations = options.specializations.filter(
    (s) => s.area === draft.studyArea,
  );

  return (
    <div className="grid gap-6">
      <SectionCard title={t("edu.where")} description={t("edu.whereHelp")}>
        <ChoiceGroup<EducationStatus>
          name="educationStatus"
          label={t("edu.statusLabel")}
          value={draft.educationStatus}
          error={err("educationStatus")}
          columns={2}
          onChange={(value) =>
            update((d) => ({ ...d, educationStatus: value }))
          }
          choices={STATUSES.map((s) => ({
            value: s,
            label: t(enumKey("educationStatus", s)),
            description: t(`edu.statusHelp.${s}` as Key),
          }))}
        />
        {draft.educationStatus === "GRADUATED" ? (
          <ChoiceGroup<Qualification>
            name="completedQualification"
            label={t("edu.highestQualification")}
            value={draft.completedQualification}
            error={err("completedQualification")}
            columns={2}
            onChange={(value) =>
              update((d) => ({ ...d, completedQualification: value }))
            }
            choices={(["BACHELOR", "MASTER"] as const).map((q) => ({
              value: q,
              label: t(enumKey("qualification", q)),
            }))}
          />
        ) : null}
      </SectionCard>

      {stages.map((stage) => (
        <StageForm
          key={stage}
          stage={stage}
          title={titleFor(stage)}
          props={props}
        />
      ))}

      <SectionCard title={t("edu.field")} description={t("edu.fieldHelp")}>
        <ChoiceGroup<StudyArea>
          name="studyArea"
          label={t("edu.areaLabel")}
          value={draft.studyArea}
          error={err("studyArea")}
          columns={2}
          onChange={(value) =>
            update((d) => ({
              ...d,
              studyArea: value,
              specialization: options.specializations.some(
                (s) => s.code === d.specialization && s.area === value,
              )
                ? d.specialization
                : null,
            }))
          }
          choices={(["CS_IT", "ECON_BUSINESS"] as const).map((a) => ({
            value: a,
            label: t(enumKey("studyArea", a)),
            description: t(`edu.areaHelp.${a}` as Key),
          }))}
        />
        {draft.studyArea ? (
          <Field
            id="specialization"
            label={t("edu.specialization")}
            optional
            hint={t("edu.specializationHint")}
          >
            {(p) => (
              <Select
                {...p}
                value={draft.specialization ?? ""}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    specialization: e.target.value || null,
                  }))
                }
              >
                <option value="">{t("edu.specializationAny")}</option>
                {specializations.map((s) => (
                  <option key={s.code} value={s.code}>
                    {t(enumKey("specialization", s.code))}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
      </SectionCard>
    </div>
  );
}
