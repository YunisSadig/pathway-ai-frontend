"use client";

import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAccountConfig } from "@/lib/account/use-account-config";
import { useT, type Key } from "@/lib/i18n";
import { safeNext } from "./session-provider";

const ERRORS: Record<string, Key> = {
  google_state: "auth.google.err.state",
  google_cancelled: "auth.google.err.cancelled",
  google_failed: "auth.google.err.failed",
  google_conflict: "auth.google.err.conflict",
  google_unverified_email: "auth.google.err.unverified",
  google_unavailable: "auth.google.err.unavailable",
};

function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 7l7.3 5.7c4.3-4 6.9-9.9 6.9-17.2z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.200.8-4.700l-7.900-6.100C.9 16.400 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.300-5.700c-2 1.400-4.700 2.300-8.600 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"
      />
    </svg>
  );
}

/** The result of a Google attempt (carried only as a short code in the address) as a plain sentence. */
export function GoogleNotice() {
  const { t } = useT();
  const code = useSearchParams().get("error");
  const key = code ? ERRORS[code] : undefined;
  return key ? <Alert kind="error">{t(key)}</Alert> : null;
}

/** "Continue with Google": a plain link, because the sign-in is a full-page trip to Google and back. Absent unless the server offers it. */
export function GoogleButton({ next }: { next?: string | null }) {
  const { t } = useT();
  const { config } = useAccountConfig();
  if (!config?.googleLoginAvailable) return null;
  const href =
    "/api/v1/account/oauth/google/start" +
    (next ? `?next=${encodeURIComponent(safeNext(next))}` : "");
  return (
    <div className="grid gap-4">
      <Button asChild variant="outline" size="lg">
        <a href={href}>
          <GoogleLogo />
          {t("auth.google.continue")}
        </a>
      </Button>
      <div
        aria-hidden
        className="flex items-center gap-3 text-xs text-muted-foreground"
      >
        <span className="h-px flex-1 bg-border" />
        {t("auth.google.or")}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
