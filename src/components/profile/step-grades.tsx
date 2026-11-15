"use client";

import { Alert } from "@/components/ui/alert";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { useT, type Key } from "@/lib/i18n";
import {
  EMPTY_EDUCATION,
  type Grade,
  type GradeScale,
  type GradeStatus,
  type Legacy,
  type Stage,
} from "@/lib/profile/types";
import { relevantStages } from "@/lib/profile/validation";
import { SectionCard, useProblemText, type StepProps } from "./shared";

const EMPTY_GRADE: Grade = {
  status: "ENTERED",
  scale: null,
  value: null,
  letter: null,
  scaleLabel: null,
  scaleMin: null,
  scaleMax: null,
};

/**
 * The order is only a convenience; nothing is preselected from the country, because a country has no single grading scale: the scale is the
 * one printed on the student's own transcript.
 */
const SCALE_ORDER: Record<"school" | "university", GradeScale[]> = {
  school: ["FIVE_POINT", "TEN_POINT", "PERCENT_100", "LETTER", "OTHER"],
  university: ["PERCENT_100", "GPA_4", "FIVE_POINT", "LETTER", "OTHER"],
};

function GradeForm({
  stage,
  title,
  props,
}: {
  stage: Stage;
  title: string;
  props: StepProps;
}) {
  const { t } = useT();
  const { draft, update, options, problems } = props;
  const err = useProblemText(problems);
  const grade = draft[stage]?.grade ?? null;
  const f = `${stage}.grade`;

  const set = (patch: Partial<Grade>) =>
    update((d) => {
      const education = d[stage] ?? EMPTY_EDUCATION;
      return {
        ...d,
        [stage]: {
          ...education,
          grade: { ...(education.grade ?? EMPTY_GRADE), ...patch },
        },
      };
    });

  const scales = SCALE_ORDER[
    stage === "school" ? "school" : "university"
  ].filter(
    (s) =>
      s === "OTHER" ||
      s === "LETTER" ||
      options.scales.some((o) => o.scale === s),
  );
  const def = options.scales.find((o) => o.scale === grade?.scale);
  const message = err(f);

  return (
    <SectionCard title={title}>
      <ChoiceGroup<GradeStatus>
        name={`${stage}-gradeStatus`}
        label={t("grades.haveLabel")}
        value={grade?.status ?? null}
        error={grade?.status ? null : message}
        columns={2}
        onChange={(status) =>
          status === "ENTERED"
            ? set({ status })
            : set({
                status,
                scale: null,
                value: null,
                letter: null,
                scaleLabel: null,
                scaleMin: null,
                scaleMax: null,
              })
        }
        choices={[
          { value: "ENTERED", label: t("grades.enter") },
          {
            value: "NOT_AVAILABLE_YET",
            label: t("grades.notYet"),
            description: t("grades.notYetHelp"),
          },
        ]}
      />
      {grade?.status === "ENTERED" ? (
        <>
          <Field
            id={`${stage}-scale`}
            label={t("grades.scaleLabel")}
            hint={t("grades.scaleHint")}
            error={grade.scale ? null : message}
          >
            {(p) => (
              <Select
                {...p}
                value={grade.scale ?? ""}
                onChange={(e) =>
                  set({
                    scale: (e.target.value || null) as GradeScale | null,
                    value: null,
                    letter: null,
                    scaleLabel: null,
                    scaleMin: null,
                    scaleMax: null,
                  })
                }
              >
                <option value="">{t("common.choose")}</option>
                {scales.map((s) => (
                  <option key={s} value={s}>
                    {t(`scale.${s}` as Key)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {grade.scale === "LETTER" ? (
            <Field
              id={`${stage}-letter`}
              label={t("grades.letter")}
              error={grade.letter ? null : message}
            >
              {(p) => (
                <Select
                  {...p}
                  value={grade.letter ?? ""}
                  onChange={(e) => set({ letter: e.target.value || null })}
                >
                  <option value="">{t("common.choose")}</option>
                  {options.letters.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}

          {grade.scale === "OTHER" ? (
            <div className="grid gap-5">
              <Field
                id={`${stage}-scaleName`}
                label={t("grades.otherName")}
                hint={t("grades.otherNameHint")}
              >
                {(p) => (
                  <Input
                    {...p}
                    maxLength={60}
                    value={grade.scaleLabel ?? ""}
                    onChange={(e) => set({ scaleLabel: e.target.value })}
                  />
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id={`${stage}-scaleMin`} label={t("grades.otherMin")}>
                  {(p) => (
                    <NumberInput
                      {...p}
                      value={grade.scaleMin}
                      onValueChange={(v) => set({ scaleMin: v })}
                    />
                  )}
                </Field>
                <Field id={`${stage}-scaleMax`} label={t("grades.otherMax")}>
                  {(p) => (
                    <NumberInput
                      {...p}
                      value={grade.scaleMax}
                      onValueChange={(v) => set({ scaleMax: v })}
                    />
                  )}
                </Field>
              </div>
            </div>
          ) : null}

          {grade.scale && grade.scale !== "LETTER" ? (
            <Field
              id={`${stage}-value`}
              label={t("grades.yourGrade")}
              hint={
                def
                  ? t("grades.rangeHint", {
                      min: def.min ?? "",
                      max: def.max ?? "",
                    })
                  : grade.scale === "OTHER"
                    ? t("grades.otherRangeHint")
                    : undefined
              }
              error={message}
            >
              {(p) => (
                <NumberInput
                  {...p}
                  value={grade.value}
                  onValueChange={(v) => set({ value: v })}
                />
              )}
            </Field>
          ) : null}
        </>
      ) : null}
    </SectionCard>
  );
}

/** Step 3: grades, entered on the scale the transcript uses. Never converted, never turned into a chance of admission. */
export function GradesStep(props: StepProps & { legacy?: Legacy | null }) {
  const { t, lang } = useT();
  const { legacy } = props;
  const { draft } = props;
  const stages = relevantStages(draft);

  const titleFor = (stage: Stage): string => {
    if (draft.educationStatus === "MASTER" && stage === "bachelor")
      return t("grades.title.priorBachelor");
    if (draft.educationStatus === "GRADUATED")
      return t("grades.title.completed");
    return t(`grades.title.${stage}` as Key);
  };

  return (
    <div className="grid gap-6">
      <Alert kind="info" title={t("grades.noConversionTitle")}>
        {t("grades.noConversionBody")}
      </Alert>
      {legacy?.gpa != null && legacy.gpaScaleMax != null ? (
        <Alert kind="info" title={t("grades.legacyTitle")}>
          {t("grades.legacyBody", {
            value: new Intl.NumberFormat(lang).format(legacy.gpa),
            max: new Intl.NumberFormat(lang).format(legacy.gpaScaleMax),
          })}
        </Alert>
      ) : null}
      {stages.length === 0 ? (
        <Alert kind="info">{t("grades.chooseEducationFirst")}</Alert>
      ) : (
        stages.map((stage) => (
          <GradeForm
            key={stage}
            stage={stage}
            title={titleFor(stage)}
            props={props}
          />
        ))
      )}
    </div>
  );
}
