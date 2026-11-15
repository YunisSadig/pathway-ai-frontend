import { dateLabel, type Key, type Lang, type Vars } from "@/lib/i18n";
import type { Budget, ExamResult, Grade } from "./types";

type T = (key: Key, vars?: Vars) => string;

const nf = (lang: Lang, max = 3) =>
  new Intl.NumberFormat(lang, { maximumFractionDigits: max });

/** A grade exactly as entered, with its scale: "4.5 on marks 1–5", never converted. */
export function gradeText(
  g: Grade | null | undefined,
  t: T,
  lang: Lang,
): string {
  if (!g || !g.status) return t("fmt.notAnswered");
  if (g.status === "NOT_AVAILABLE_YET") return t("grades.notYet");
  const n = nf(lang);
  switch (g.scale) {
    case "FIVE_POINT":
      return t("fmt.gradeOn", {
        value: n.format(g.value ?? 0),
        scale: t("scale.short.FIVE_POINT"),
      });
    case "TEN_POINT":
      return t("fmt.gradeOn", {
        value: n.format(g.value ?? 0),
        scale: t("scale.short.TEN_POINT"),
      });
    case "PERCENT_100":
      return t("fmt.gradeOn", {
        value: n.format(g.value ?? 0),
        scale: t("scale.short.PERCENT_100"),
      });
    case "GPA_4":
      return t("fmt.gradeOn", {
        value: n.format(g.value ?? 0),
        scale: t("scale.short.GPA_4"),
      });
    case "LETTER":
      return t("fmt.gradeLetter", { letter: g.letter ?? "" });
    case "OTHER":
      return t("fmt.gradeOn", {
        value: n.format(g.value ?? 0),
        scale: `${g.scaleLabel ?? ""} (${n.format(g.scaleMin ?? 0)}–${n.format(g.scaleMax ?? 0)})`,
      });
    default:
      return t("fmt.notAnswered");
  }
}

export function budgetText(
  b: Budget | null | undefined,
  t: T,
  lang: Lang,
): string {
  if (!b || !b.status) return t("fmt.notAnswered");
  if (b.status === "NOT_SURE") return t("budget.notSure");
  if (b.amount === null || !b.currency) return t("fmt.notAnswered");
  try {
    return t("fmt.perYear", {
      amount: new Intl.NumberFormat(lang, {
        style: "currency",
        currency: b.currency,
        maximumFractionDigits: 2,
      }).format(b.amount),
    });
  } catch {
    return t("fmt.perYear", {
      amount: `${nf(lang, 2).format(b.amount)} ${b.currency}`,
    });
  }
}

export function examText(e: ExamResult, t: T, lang: Lang): string {
  const score = nf(lang, 2).format(e.overall);
  const variant = e.variant
    ? ` · ${t(`enum.variant.${e.variant}` as Key)}`
    : "";
  return t("fmt.exam", {
    exam: t(`enum.exam.${e.exam}` as Key),
    variant,
    score,
    date: dateLabel(e.testDate, lang),
  });
}
