"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { en, type Key } from "./en";
import { ru } from "./ru";

export type Lang = "en" | "ru";
export const LANGS: readonly Lang[] = ["en", "ru"];
export type { Key };

const DICTIONARIES: Record<Lang, Record<Key, string>> = { en, ru };
const STORAGE_KEY = "pathway-lang";
const COOKIE = "pathway-lang";
const EVENT = "pathway-lang-change";

export type Vars = Record<string, string | number>;

/** Pure translation (also used outside React, e.g. in tests). Missing keys fall back to English; the unit tests fail on a missing key. */
export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const text = DICTIONARIES[lang][key] ?? en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

function readStored(): Lang | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "en" || value === "ru" ? value : null;
  } catch {
    return null;
  }
}

/** The language shown when the visitor has not chosen one: their browser's preference if it is Russian, otherwise English. */
function detect(): Lang {
  const stored = readStored();
  if (stored) return stored;
  const preferred = typeof navigator === "undefined" ? [] : navigator.languages;
  const first = preferred.find((l) => /^(en|ru)\b/i.test(l));
  return first && /^ru/i.test(first) ? "ru" : "en";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

interface LanguageContextValue {
  lang: Lang;
  /** Persists the choice in this browser (not a token, not personal data). */
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * The server and the first client render use English so that hydration always matches; the visitor's stored (or detected) language is applied
 * right after. The choice lives in localStorage and a plain cookie (language is not a secret) and is also reflected in `<html lang>`.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore<Lang>(subscribe, detect, () => "en");

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage can be blocked; the cookie below still remembers the choice
    }
    document.cookie = `${COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event(EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: Key, vars?: Vars) => translate(lang, key, vars),
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}

/** Whether the visitor has made an explicit choice (so a server-side preference must not override it). */
export function hasStoredLanguage(): boolean {
  return typeof window !== "undefined" && readStored() !== null;
}

// ---- locale-aware names (never hard-coded translations of country or month names) ----

export function countryName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function monthLabel(yearMonth: string, lang: Lang): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function dateLabel(isoDate: string, lang: Lang): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function currencyLabel(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}
