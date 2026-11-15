"use client";

import { Pencil } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { countryName, monthLabel, useT, type Key } from "@/lib/i18n";
import { budgetText, examText, gradeText } from "@/lib/profile/format";
import type { Education, Experience, Stage } from "@/lib/profile/types";
import {
  relevantStages,
  type Problems,
  type StepName,
} from "@/lib/profile/validation";
import { SectionCard, enumKey, type StepProps } from "./shared";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: StepName;
  onEdit: (step: StepName) => void;
  children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <SectionCard title={title}>
      <dl className="grid gap-3">{children}</dl>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(step)}
        >
          <Pencil aria-hidden />
          {t("review.edit")}
          <span className="sr-only"> — {title}</span>
        </Button>
      </div>
    </SectionCard>
  );
}

function ExperienceList({ items }: { items: Experience[] }) {
  const { t, lang } = useT();
  return (
    <ul className="grid gap-1">
      {items.map((e, i) => (
        <li key={i}>
          {e.role} — {e.organization}
          {e.startMonth ? (
            <span className="text-muted-foreground">
              {" "}
              ({monthLabel(e.startMonth, lang)} –{" "}
              {e.ongoing
                ? t("exp.present")
                : e.endMonth
                  ? monthLabel(e.endMonth, lang)
                  : "…"}
              )
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Step 6: everything in one place before finishing. Each block links back to the step that edits it. */
export function ReviewStep({
  props,
  onEdit,
  incomplete,
}: {
  props: StepProps;
  onEdit: (step: StepName) => void;
  incomplete: Problems;
}) {
  const { t, lang } = useT();
  const { draft, destinations } = props;
  const stages = relevantStages(draft);

  const stageTitle = (stage: Stage): string => {
    if (draft.educationStatus === "MASTER" && stage === "bachelor")
      return t("edu.stage.priorBachelor");
    if (draft.educationStatus === "GRADUATED") return t("edu.stage.completed");
    return t(`edu.stage.${stage}` as Key);
  };
  const eduLine = (e: Education | null) =>
    [
      e?.institution,
      e?.program,
      e?.country ? countryName(e.country, lang) : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("fmt.notAnswered");
  const none = t("fmt.notAnswered");

  return (
    <div className="grid gap-6">
      {Object.keys(incomplete).length ? (
        <Alert kind="error" title={t("review.missingTitle")}>
          {t("review.missingBody")}
        </Alert>
      ) : (
        <Alert kind="success" title={t("review.readyTitle")}>
          {t("review.readyBody")}
        </Alert>
      )}

      <ReviewSection
        title={t("step.background")}
        step="background"
        onEdit={onEdit}
      >
        <Row label={t("bg.citizenship")}>
          {draft.citizenship ? countryName(draft.citizenship, lang) : none}
        </Row>
        <Row label={t("bg.residence")}>
          {draft.residence ? countryName(draft.residence, lang) : none}
        </Row>
      </ReviewSection>

      <ReviewSection
        title={t("step.education")}
        step="education"
        onEdit={onEdit}
      >
        <Row label={t("edu.statusLabel")}>
          {draft.educationStatus
            ? t(enumKey("educationStatus", draft.educationStatus))
            : none}
        </Row>
        {stages.map((s) => (
          <Row key={s} label={stageTitle(s)}>
            {eduLine(draft[s])}
            {draft[s]?.graduationYear ? (
              <span className="text-muted-foreground">
                {" "}
                · {draft[s]?.graduationYear}
              </span>
            ) : null}
          </Row>
        ))}
        <Row label={t("edu.areaLabel")}>
          {draft.studyArea ? t(enumKey("studyArea", draft.studyArea)) : none}
          {draft.specialization
            ? ` · ${t(enumKey("specialization", draft.specialization))}`
            : ""}
        </Row>
      </ReviewSection>

      <ReviewSection title={t("step.grades")} step="grades" onEdit={onEdit}>
        {stages.map((s) => (
          <Row key={s} label={stageTitle(s)}>
            {gradeText(draft[s]?.grade, t, lang)}
          </Row>
        ))}
      </ReviewSection>

      <ReviewSection
        title={t("step.experience")}
        step="experience"
        onEdit={onEdit}
      >
        <Row label={t("exp.skills")}>
          {draft.skills.length
            ? draft.skills
                .map((s) => (s.code ? t(enumKey("skill", s.code)) : s.label))
                .join(", ")
            : t("review.noSkills")}
        </Row>
        <Row label={t("exp.internships")}>
          {draft.internshipsStatus === "HAS" ? (
            <ExperienceList items={draft.internships} />
          ) : draft.internshipsStatus === "NONE" ? (
            t("exp.internshipsNone")
          ) : (
            none
          )}
        </Row>
        <Row label={t("exp.volunteering")}>
          {draft.volunteeringStatus === "HAS" ? (
            <ExperienceList items={draft.volunteering} />
          ) : draft.volunteeringStatus === "NONE" ? (
            t("exp.volunteeringNone")
          ) : (
            none
          )}
        </Row>
        <Row label={t("exam.title")}>
          {draft.examsStatus === "TAKEN" ? (
            <ul className="grid gap-1">
              {draft.exams.map((e, i) => (
                <li key={i}>{examText(e, t, lang)}</li>
              ))}
            </ul>
          ) : draft.examsStatus === "NOT_TAKEN" ? (
            t("exam.notTaken")
          ) : (
            none
          )}
        </Row>
      </ReviewSection>

      <ReviewSection
        title={t("step.preferences")}
        step="preferences"
        onEdit={onEdit}
      >
        <Row label={t("pref.targetLabel")}>
          {draft.targetDegreeLevel
            ? t(enumKey("qualification", draft.targetDegreeLevel))
            : none}
        </Row>
        <Row label={t("pref.intake")}>
          {draft.intakeSeason && draft.intakeYear
            ? `${t(`enum.season.${draft.intakeSeason}` as Key)} ${draft.intakeYear}`
            : t("review.noIntake")}
        </Row>
        <Row label={t("pref.destinations")}>
          {destinations.restricted
            ? t("pref.restrictedShort")
            : draft.destinations.length
              ? draft.destinations.map((c) => countryName(c, lang)).join(", ")
              : none}
        </Row>
        {draft.preferredUniversities.length ? (
          <Row label={t("pref.chooseUniversities")}>
            {draft.preferredUniversities
              .map(
                (slug) =>
                  destinations.universities.find((u) => u.slug === slug)
                    ?.name ?? slug,
              )
              .join(", ")}
          </Row>
        ) : null}
        <Row label={t("budget.title")}>{budgetText(draft.budget, t, lang)}</Row>
      </ReviewSection>
    </div>
  );
}
