"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { useErrorText } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import { useSlowPhase } from "@/lib/account/use-slow-phase";
import { useT, type Key } from "@/lib/i18n";
import { TextLink } from "./auth-shell";
import { GoogleButton, GoogleNotice } from "./google-button";
import { safeNext, useSession } from "./session-provider";

const REASONS: Record<string, { kind: "info" | "success"; key: Key }> = {
  required: { kind: "info", key: "auth.reason.required" },
  expired: { kind: "info", key: "auth.reason.expired" },
  deleted: { kind: "success", key: "auth.reason.deleted" },
  reset: { kind: "success", key: "auth.reason.reset" },
  verified: { kind: "success", key: "auth.reason.verified" },
};

/** If the router has not left the login page this long after a successful login, a full page navigation takes over. */
const NAVIGATION_FALLBACK_MS = 4000;

/**
 * Log in. The button can never stay "Logging in…": the request is bounded (see apiTimeoutMs), every outcome (success, error, timeout)
 * ends the busy state, a second submit while one is running is ignored, and the form forgets the password once it has been used. A page
 * that is kept mounted by the router (Next keeps visited pages alive) therefore comes back clean after a log out.
 */
export function LoginForm() {
  const { t } = useT();
  const { describe } = useErrorText();
  const router = useRouter();
  const params = useSearchParams();
  const { state, signIn } = useSession();
  const { config } = useAccountConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const phase = useSlowPhase(pending);
  const notice = REASONS[params.get("reason") ?? ""];
  const next = params.get("next");
  const signedIn = state.status === "authenticated";

  // someone who is already signed in has no use for this page: send them where they were going
  useEffect(() => {
    if (signedIn) router.replace(safeNext(next));
  }, [signedIn, next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || signedIn) return; // a double click or a second Enter never sends a second login
    if (!email.trim() || !password) {
      setError(t("auth.enterBoth"));
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const account = await accountApi.login({ email: email.trim(), password });
      signIn(account); // the response already says who this is; no second request to wait on
      setPassword(""); // the password is not kept once it has been used
      const target = safeNext(next);
      router.replace(target);
      window.setTimeout(() => {
        if (window.location.pathname.startsWith("/login"))
          window.location.assign(target);
      }, NAVIGATION_FALLBACK_MS);
    } catch (e) {
      setError(describe(e));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <GoogleNotice />
      <GoogleButton next={next} />
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-5"
        aria-busy={pending}
      >
        {notice ? <Alert kind={notice.kind}>{t(notice.key)}</Alert> : null}
        {error ? <Alert kind="error">{error}</Alert> : null}
        <Field id="email" label={t("auth.email")}>
          {(p) => (
            <Input
              {...p}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>
        <Field id="password" label={t("auth.password")}>
          {(p) => (
            <Input
              {...p}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>
        <Button type="submit" size="lg" disabled={pending || signedIn}>
          {pending
            ? t("auth.loggingIn")
            : signedIn
              ? t("auth.redirecting")
              : t("auth.login")}
        </Button>
        <div role="status" aria-live="polite">
          {phase > 0 ? (
            <Alert kind="info">
              {t(phase === 1 ? "auth.slow1" : "auth.slow2")}
            </Alert>
          ) : null}
        </div>
        {config?.emailDeliveryAvailable ? (
          <p className="text-center text-sm">
            <TextLink href="/forgot-password">{t("auth.forgot")}</TextLink>
          </p>
        ) : null}
      </form>
    </div>
  );
}
