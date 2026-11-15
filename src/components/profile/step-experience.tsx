"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { dateLabel, useT, type Key } from "@/lib/i18n";
import type {
  ExamName,
  ExamResult,
  ExamSection,
  ExamsStatus,
  Experience,
  HasOrNone,
  Skill,
} from "@/lib/profile/types";
import { SectionCard, enumKey, useProblemText, type StepProps } from "./shared";

// ------------------------------------------------------------------------------------------------ skills

function SkillPicker({ props }: { props: StepProps }) {
  const { t } = useT();
  const { draft, update, options } = props;
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState("");

  const groups =
    draft.studyArea === "CS_IT"
      ? ["IT", "BOTH"]
      : draft.studyArea === "ECON_BUSINESS"
        ? ["ECON", "BOTH"]
        : ["IT", "ECON", "BOTH"];
  const curated = useMemo(
    () =>
      options.skills
        .filter((s) => groups.includes(s.group))
        .map((s) => ({ code: s.code, label: t(enumKey("skill", s.code)) }))
        .filter((s) =>
          s.label.toLowerCase().includes(query.trim().toLowerCase()),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groups derives from studyArea
    [options.skills, draft.studyArea, query, t],
  );
  const has = (code: string) => draft.skills.some((s) => s.code === code);
  const toggle = (code: string) =>
    update((d) => ({
      ...d,
      skills: d.skills.some((s) => s.code === code)
        ? d.skills.filter((s) => s.code !== code)
        : [...d.skills, { code, label: null }],
    }));
  const customSkills = draft.skills.filter((s) => !s.code);

  function addCustom() {
    const label = custom.trim().replace(/\s+/g, " ");
    if (label.length < 2) return;
    if (
      !draft.skills.some(
        (s) => !s.code && s.label?.toLowerCase() === label.toLowerCase(),
      )
    )
      update((d) => ({
        ...d,
        skills: [...d.skills, { code: null, label } satisfies Skill],
      }));
    setCustom("");
  }

  return (
    <SectionCard title={t("exp.skills")} description={t("exp.skillsHelp")}>
      <Field id="skillSearch" label={t("exp.skillSearch")} optional>
        {(p) => (
          <Input
            {...p}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      </Field>
      <div
        role="group"
        aria-label={t("exp.skills")}
        className="flex flex-wrap gap-2"
      >
        {curated.map((s) => (
          <button
            key={s.code}
            type="button"
            aria-pressed={has(s.code)}
            onClick={() => toggle(s.code)}
            className="min-h-9 rounded-full border border-border-strong bg-surface px-3.5 text-sm font-medium transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-selected aria-pressed:text-primary-soft-foreground"
          >
            {s.label}
          </button>
        ))}
        {curated.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("common.noMatches")}
          </p>
        ) : null}
      </div>
      {customSkills.length ? (
        <ul
          className="flex flex-wrap gap-2"
          aria-label={t("exp.yourOwnSkills")}
        >
          {customSkills.map((s) => (
            <li
              key={s.label}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-selected py-1 pr-1 pl-3.5 text-sm font-medium"
            >
              {s.label}
              <button
                type="button"
                aria-label={t("exp.removeSkill", { name: s.label ?? "" })}
                onClick={() =>
                  update((d) => ({
                    ...d,
                    skills: d.skills.filter((x) => x !== s),
                  }))
                }
                className="grid size-7 place-items-center rounded-full hover:bg-hover focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-end gap-2">
        <Field
          id="customSkill"
          label={t("exp.otherSkill")}
          optional
          className="flex-1"
          hint={t("exp.otherSkillHint")}
        >
          {(p) => (
            <Input
              {...p}
              maxLength={40}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
          )}
        </Field>
        <Button
          type="button"
          variant="outline"
          onClick={addCustom}
          disabled={custom.trim().length < 2}
        >
          <Plus aria-hidden />
          {t("common.add")}
        </Button>
      </div>
    </SectionCard>
  );
}

// ------------------------------------------------------------------------------------------------ internships and volunteering

const NEW_EXPERIENCE: Experience = {
  organization: "",
  role: "",
  field: null,
  startMonth: null,
  endMonth: null,
  ongoing: false,
  description: null,
};

function ExperienceSection({
  kind,
  props,
}: {
  kind: "internships" | "volunteering";
  props: StepProps;
}) {
  const { t } = useT();
  const { draft, update, problems } = props;
  const err = useProblemText(problems);
  const statusKey =
    kind === "internships" ? "internshipsStatus" : "volunteeringStatus";
  const status = draft[statusKey];
  const items = draft[kind];
  const set = (index: number, patch: Partial<Experience>) =>
    update((d) => ({
      ...d,
      [kind]: d[kind].map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));

  return (
    <SectionCard
      title={t(`exp.${kind}` as Key)}
      description={t(`exp.${kind}Help` as Key)}
    >
      <ChoiceGroup<HasOrNone>
        name={kind}
        label={t(`exp.${kind}Question` as Key)}
        value={status}
        error={err(statusKey) ?? err(kind)}
        columns={2}
        onChange={(value) =>
          update((d) => ({
            ...d,
            [statusKey]: value,
            // "none" keeps entries out of the profile, but they are only hidden on screen until the student saves again
            [kind]:
              value === "NONE"
                ? []
                : d[kind].length
                  ? d[kind]
                  : [{ ...NEW_EXPERIENCE }],
          }))
        }
        choices={[
          { value: "NONE", label: t(`exp.${kind}None` as Key) },
          { value: "HAS", label: t(`exp.${kind}Has` as Key) },
        ]}
      />
      {status === "HAS" ? (
        <div className="grid gap-4">
          {items.map((e, i) => {
            const f = `${kind}[${i}]`;
            return (
              <fieldset
                key={i}
                className="grid gap-4 rounded-xl border border-border p-4"
              >
                <legend className="px-1 text-sm font-semibold">
                  {t(`exp.${kind}Entry` as Key, { n: i + 1 })}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id={`${f}-org`}
                    label={t("exp.organization")}
                    error={err(`${f}.organization`)}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        maxLength={120}
                        value={e.organization}
                        onChange={(ev) =>
                          set(i, { organization: ev.target.value })
                        }
                      />
                    )}
                  </Field>
                  <Field
                    id={`${f}-role`}
                    label={t("exp.role")}
                    error={err(`${f}.role`)}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        maxLength={120}
                        value={e.role}
                        onChange={(ev) => set(i, { role: ev.target.value })}
                      />
                    )}
                  </Field>
                </div>
                <Field id={`${f}-field`} label={t("exp.field")} optional>
                  {(p) => (
                    <Input
                      {...p}
                      maxLength={60}
                      value={e.field ?? ""}
                      onChange={(ev) =>
                        set(i, { field: ev.target.value || null })
                      }
                    />
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id={`${f}-start`}
                    label={t("exp.start")}
                    optional
                    error={err(`${f}.startMonth`)}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        type="month"
                        value={e.startMonth ?? ""}
                        onChange={(ev) =>
                          set(i, { startMonth: ev.target.value || null })
                        }
                      />
                    )}
                  </Field>
                  <Field
                    id={`${f}-end`}
                    label={t("exp.end")}
                    optional
                    error={err(`${f}.endMonth`)}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        type="month"
                        disabled={!!e.ongoing}
                        value={e.endMonth ?? ""}
                        onChange={(ev) =>
                          set(i, { endMonth: ev.target.value || null })
                        }
                      />
                    )}
                  </Field>
                </div>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={!!e.ongoing}
                    onChange={(ev) =>
                      set(i, {
                        ongoing: ev.target.checked,
                        endMonth: ev.target.checked ? null : e.endMonth,
                      })
                    }
                    className="size-5 cursor-pointer accent-[var(--primary)]"
                  />
                  {t("exp.ongoing")}
                </label>
                <Field
                  id={`${f}-desc`}
                  label={t("exp.description")}
                  optional
                  hint={t("exp.descriptionHint")}
                >
                  {(p) => (
                    <Textarea
                      {...p}
                      maxLength={1000}
                      value={e.description ?? ""}
                      onChange={(ev) =>
                        set(i, { description: ev.target.value || null })
                      }
                    />
                  )}
                </Field>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        [kind]: d[kind].filter((_, k) => k !== i),
                      }))
                    }
                  >
                    <Trash2 aria-hidden />
                    {t("common.remove")}
                  </Button>
                </div>
              </fieldset>
            );
          })}
          {items.length < 10 ? (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  update((d) => ({
                    ...d,
                    [kind]: [...d[kind], { ...NEW_EXPERIENCE }],
                  }))
                }
              >
                <Plus aria-hidden />
                {t("exp.addAnother")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

// ------------------------------------------------------------------------------------------------ exams

const NEW_EXAM: ExamResult = {
  exam: "IELTS",
  variant: "ACADEMIC",
  testDate: "",
  overall: Number.NaN,
  sections: [],
};

function sectionNames(
  r: ExamResult,
): { name: string; min: number; max: number; half: boolean }[] {
  if (r.exam === "IELTS")
    return ["LISTENING", "READING", "WRITING", "SPEAKING"].map((name) => ({
      name,
      min: 1,
      max: 9,
      half: true,
    }));
  if (r.exam === "TOEFL")
    return r.variant === "NEW_1_6"
      ? ["READING", "LISTENING", "SPEAKING", "WRITING"].map((name) => ({
          name,
          min: 1,
          max: 6,
          half: true,
        }))
      : ["READING", "LISTENING", "SPEAKING", "WRITING"].map((name) => ({
          name,
          min: 0,
          max: 30,
          half: false,
        }));
  return [
    { name: "READING_WRITING", min: 200, max: 800, half: false },
    { name: "MATH", min: 200, max: 800, half: false },
  ];
}

function ExamSection({ props }: { props: StepProps }) {
  const { t, lang } = useT();
  const { draft, update, problems } = props;
  const err = useProblemText(problems);
  const set = (index: number, patch: Partial<ExamResult>) =>
    update((d) => ({
      ...d,
      exams: d.exams.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  return (
    <SectionCard title={t("exam.title")} description={t("exam.help")}>
      <ChoiceGroup<ExamsStatus>
        name="examsStatus"
        label={t("exam.question")}
        value={draft.examsStatus}
        error={err("examsStatus") ?? err("exams")}
        columns={2}
        onChange={(value) =>
          update((d) => ({
            ...d,
            examsStatus: value,
            exams:
              value === "NOT_TAKEN"
                ? []
                : d.exams.length
                  ? d.exams
                  : [{ ...NEW_EXAM }],
          }))
        }
        choices={[
          {
            value: "NOT_TAKEN",
            label: t("exam.notTaken"),
            description: t("exam.notTakenHelp"),
          },
          { value: "TAKEN", label: t("exam.taken") },
        ]}
      />
      {draft.examsStatus === "TAKEN" ? (
        <div className="grid gap-4">
          {draft.exams.map((r, i) => {
            const f = `exams[${i}]`;
            const sections = sectionNames(r);
            const old =
              r.exam === "IELTS" &&
              r.testDate &&
              new Date(`${r.testDate}T00:00:00Z`) < twoYearsAgo;
            const setSection = (name: string, score: number | null) =>
              set(i, {
                sections: [
                  ...(r.sections ?? []).filter((s) => s.section !== name),
                  ...(score === null
                    ? []
                    : [{ section: name, score } satisfies ExamSection]),
                ],
              });
            return (
              <fieldset
                key={i}
                className="grid gap-4 rounded-xl border border-border p-4"
              >
                <legend className="px-1 text-sm font-semibold">
                  {t("exam.entry", { n: i + 1 })}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`${f}-exam`} label={t("exam.which")}>
                    {(p) => (
                      <Select
                        {...p}
                        value={r.exam}
                        onChange={(e) => {
                          const exam = e.target.value as ExamName;
                          set(i, {
                            exam,
                            variant:
                              exam === "IELTS"
                                ? "ACADEMIC"
                                : exam === "TOEFL"
                                  ? "NEW_1_6"
                                  : null,
                            overall: Number.NaN,
                            sections: [],
                          });
                        }}
                      >
                        {(["IELTS", "TOEFL", "SAT"] as const).map((x) => (
                          <option key={x} value={x}>
                            {t(enumKey("exam", x))}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  {r.exam !== "SAT" ? (
                    <Field
                      id={`${f}-variant`}
                      label={t("exam.reportType")}
                      hint={
                        r.exam === "TOEFL" ? t("exam.toeflHint") : undefined
                      }
                    >
                      {(p) => (
                        <Select
                          {...p}
                          value={r.variant ?? ""}
                          onChange={(e) =>
                            set(i, {
                              variant: e.target.value,
                              overall: Number.NaN,
                              sections: [],
                            })
                          }
                        >
                          {(r.exam === "IELTS"
                            ? ["ACADEMIC", "GENERAL"]
                            : ["NEW_1_6", "LEGACY_0_120"]
                          ).map((v) => (
                            <option key={v} value={v}>
                              {t(enumKey("variant", v))}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id={`${f}-date`}
                    label={t("exam.date")}
                    error={err(f) && !r.testDate ? err(f) : null}
                  >
                    {(p) => (
                      <Input
                        {...p}
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={r.testDate}
                        onChange={(e) => set(i, { testDate: e.target.value })}
                      />
                    )}
                  </Field>
                  <Field
                    id={`${f}-overall`}
                    label={t(r.exam === "SAT" ? "exam.total" : "exam.overall")}
                    hint={t(
                      `exam.range.${r.exam}${r.variant ? `.${r.variant}` : ""}` as Key,
                    )}
                    error={r.testDate ? err(f) : null}
                  >
                    {(p) => (
                      <NumberInput
                        {...p}
                        value={Number.isNaN(r.overall) ? null : r.overall}
                        onValueChange={(v) =>
                          set(i, { overall: v ?? Number.NaN })
                        }
                      />
                    )}
                  </Field>
                </div>
                {old ? (
                  <Alert kind="info">
                    {t("exam.ieltsOld", { date: dateLabel(r.testDate, lang) })}
                  </Alert>
                ) : null}
                <details className="rounded-lg border border-border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t("exam.sections")}
                  </summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {sections.map((s) => (
                      <Field
                        key={s.name}
                        id={`${f}-${s.name}`}
                        label={t(`section.${s.name}` as Key)}
                        optional
                        hint={t("exam.sectionRange", {
                          min: s.min,
                          max: s.max,
                        })}
                      >
                        {(p) => (
                          <NumberInput
                            {...p}
                            value={
                              (r.sections ?? []).find(
                                (x) => x.section === s.name,
                              )?.score ?? null
                            }
                            onValueChange={(v) => setSection(s.name, v)}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                </details>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        exams: d.exams.filter((_, k) => k !== i),
                      }))
                    }
                  >
                    <Trash2 aria-hidden />
                    {t("common.remove")}
                  </Button>
                </div>
              </fieldset>
            );
          })}
          {draft.exams.length < 12 ? (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  update((d) => ({
                    ...d,
                    exams: [...d.exams, { ...NEW_EXAM }],
                  }))
                }
              >
                <Plus aria-hidden />
                {t("exam.addAnother")}
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t("exam.noEquivalence")}
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}

/** Step 4: skills, internships, volunteering and exam results. "None yet" is an honest answer; nothing is ever required to be invented. */
export function ExperienceStep(props: StepProps) {
  return (
    <div className="grid gap-6">
      <SkillPicker props={props} />
      <ExperienceSection kind="internships" props={props} />
      <ExperienceSection kind="volunteering" props={props} />
      <ExamSection props={props} />
    </div>
  );
}
