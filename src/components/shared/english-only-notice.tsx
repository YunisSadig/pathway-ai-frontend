"use client";

import { Alert } from "@/components/ui/alert";
import { useT } from "@/lib/i18n";

/** Shown on pages that are not translated yet (long legal text), so a Russian-speaking visitor is told instead of left guessing. */
export function EnglishOnlyNotice() {
  const { lang, t } = useT();
  if (lang === "en") return null;
  return (
    <div className="page-container pt-6">
      <Alert kind="info">{t("notice.englishOnly")}</Alert>
    </div>
  );
}
