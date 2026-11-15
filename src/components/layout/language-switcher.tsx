"use client";

import { Languages } from "lucide-react";
import { useSession } from "@/components/account/session-provider";
import { useT, type Lang } from "@/lib/i18n";
import { profileApi } from "@/lib/profile/api";

const LABELS: Record<Lang, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  ru: { short: "RU", name: "Русский" },
};

/**
 * One compact toggle that offers the OTHER language ("RU" while English is shown, "EN" while Russian is shown), so it fits next to the
 * logo on a phone. The choice is remembered in this browser and, when signed in, in the profile; Settings has the full choice.
 */
export function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const { state } = useSession();
  const other: Lang = lang === "en" ? "ru" : "en";
  const target = LABELS[other];

  function choose() {
    setLang(other);
    if (state.status === "authenticated")
      void profileApi.setLanguage(other).catch(() => undefined);
  }

  return (
    <button
      type="button"
      lang={other}
      title={target.name}
      aria-label={`${target.short} — ${target.name}`}
      onClick={choose}
      className="inline-flex h-9 min-w-[3.25rem] items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 text-xs font-bold text-foreground transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Languages aria-hidden className="size-3.5 text-muted-foreground" />
      {target.short}
    </button>
  );
}
