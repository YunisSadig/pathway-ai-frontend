import { ApiError } from "@/lib/api/client";
import { useT, type Key, type Vars } from "@/lib/i18n";

type T = (key: Key, vars?: Vars) => string;

const BY_CODE: Record<string, Key> = {
  INVALID_CREDENTIALS: "err.INVALID_CREDENTIALS",
  EMAIL_TAKEN: "err.EMAIL_TAKEN",
  WEAK_PASSWORD: "err.WEAK_PASSWORD",
  WRONG_PASSWORD: "err.WRONG_PASSWORD",
  TOO_MANY_ATTEMPTS: "err.TOO_MANY_ATTEMPTS",
  INVALID_TOKEN: "err.INVALID_TOKEN",
  EMAIL_NOT_VERIFIED: "err.EMAIL_NOT_VERIFIED",
  REGISTRATION_CLOSED: "err.REGISTRATION_CLOSED",
  EMAIL_UNAVAILABLE: "err.EMAIL_UNAVAILABLE",
  UNAUTHENTICATED: "err.session",
  CATALOGUE_PROTECTED: "err.CATALOGUE_PROTECTED",
  LIMIT_REACHED: "err.LIMIT_REACHED",
  NOT_FOUND: "err.NOT_FOUND",
};

/** A message that is safe and useful to show, in the visitor's language: known reasons by code, the status otherwise. */
export function describeErrorWith(t: T, error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t("err.network");
    if (error.code && BY_CODE[error.code]) return t(BY_CODE[error.code]);
    if (error.status === 429) return t("err.TOO_MANY_ATTEMPTS");
    if (error.status >= 500) return t("err.server");
    if (error.status === 401) return t("err.session");
    if (error.status === 403) return t("err.forbidden");
    return t("err.generic");
  }
  return t("err.generic");
}

/** Field name -> message for showing each API violation under its own input. */
export function fieldErrorsWith(t: T, error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (error instanceof ApiError) {
    for (const v of error.violations) {
      if (v.field in out) continue;
      out[v.field] =
        error.code === "WEAK_PASSWORD"
          ? t("err.WEAK_PASSWORD")
          : v.field === "email"
            ? t("err.invalidEmail")
            : t("err.INVALID");
    }
  }
  return out;
}

/** Hook form: the two functions bound to the current language. */
export function useErrorText() {
  const { t } = useT();
  return {
    describe: (error: unknown) => describeErrorWith(t, error),
    fields: (error: unknown) => fieldErrorsWith(t, error),
  };
}
