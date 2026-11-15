"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { useErrorText } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import { useSlowPhase } from "@/lib/account/use-slow-phase";
import { useT } from "@/lib/i18n";
import { useSession } from "./session-provider";

const MIN = 10;

export function SignupForm() {
  const { t } = useT();
  const { describe, fields } = useErrorText();
  const router = useRouter();
  const { signIn } = useSession();
  const { config } = useAccountConfig();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const inFlight = useRef(false);
  const phase = useSlowPhase(pending);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return; // a double click never registers twice
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = t("err.invalidEmail");
    if (password.length < MIN)
      next.password = t("auth.passwordShort", { n: MIN });
    if (!agreed) next.agreed = t("auth.agreeError");
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    inFlight.current = true;
    setPending(true);
    try {
      const result = await accountApi.register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      if (result.status === "CHECK_EMAIL" || !result.account) {
        setCheckEmail(email.trim());
        return;
      }
      signIn(result.account);
      setPassword(""); // not kept once used
      const target = "/dashboard?welcome=1";
      router.replace(target);
      // last resort if the router did not leave this page: a full navigation
      window.setTimeout(() => {
        if (window.location.pathname.startsWith("/signup"))
          window.location.assign(new URL(target, window.location.origin).href);
      }, 4000);
    } catch (e) {
      const f = fields(e);
      if (Object.keys(f).length) setErrors(f);
      else setFormError(describe(e));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <Alert kind="success" title={t("auth.checkInbox")}>
        {t("auth.checkInboxBody", { email: checkEmail })}
      </Alert>
    );
  }

  if (config && !config.registrationOpen) {
    return (
      <Alert kind="info" title={t("auth.closedTitle")}>
        {t("auth.closedBody")}{" "}
        <Link href="/login" className="font-semibold underline">
          {t("auth.login")}
        </Link>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {formError ? <Alert kind="error">{formError}</Alert> : null}
      <Field id="email" label={t("auth.email")} error={errors.email}>
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
      <Field
        id="displayName"
        label={t("bg.name")}
        optional
        hint={t("bg.nameHint")}
        error={errors.displayName}
      >
        {(p) => (
          <Input
            {...p}
            type="text"
            name="displayName"
            autoComplete="given-name"
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
      </Field>
      <Field
        id="password"
        label={t("auth.password")}
        hint={t("auth.passwordHint", { n: MIN, count: password.length })}
        error={errors.password}
      >
        {(p) => (
          <div className="flex gap-2">
            <Input
              {...p}
              type={show ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
            >
              {show ? t("auth.hide") : t("auth.show")}
            </Button>
          </div>
        )}
      </Field>
      <div className="grid gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="agreed"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-invalid={errors.agreed ? true : undefined}
            aria-describedby={errors.agreed ? "agreed-error" : undefined}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--primary)]"
          />
          <span>
            {t("auth.agreePrefix")}{" "}
            <Link href="/terms" className="font-semibold underline">
              {t("footer.terms")}
            </Link>{" "}
            {t("auth.agreeAnd")}{" "}
            <Link href="/privacy" className="font-semibold underline">
              {t("footer.privacy")}
            </Link>
            .
          </span>
        </label>
        {errors.agreed ? (
          <p id="agreed-error" className="text-sm font-medium text-danger">
            <span className="sr-only">{t("common.error")}: </span>
            {errors.agreed}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("auth.creating") : t("auth.createAccount")}
      </Button>
      <div role="status" aria-live="polite">
        {phase > 0 ? (
          <Alert kind="info">
            {t(phase === 1 ? "auth.slow1" : "auth.slow2")}
          </Alert>
        ) : null}
      </div>
      {config && !config.emailDeliveryAvailable ? (
        <p className="text-sm text-muted-foreground">{t("auth.noEmailYet")}</p>
      ) : null}
    </form>
  );
}
