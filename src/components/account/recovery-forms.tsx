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
import { useT } from "@/lib/i18n";

/** "Forgot your password": answers the same for every address, and says plainly when email is not available yet. */
export function ForgotPasswordForm() {
  const { t } = useT();
  const { describe } = useErrorText();
  const { config } = useAccountConfig();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (config && !config.emailDeliveryAvailable) {
    return (
      <Alert kind="info" title={t("auth.notAvailableTitle")}>
        {t("auth.resetUnavailable")}
      </Alert>
    );
  }
  if (sent) {
    return (
      <Alert kind="success" title={t("auth.checkInbox")}>
        {t("auth.resetSent")}
      </Alert>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!email.trim()) {
      setError(t("auth.enterEmail"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await accountApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(describe(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
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
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("auth.sending") : t("auth.sendLink")}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const { t } = useT();
  const { describe, fields } = useErrorText();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <Alert kind="error" title={t("auth.linkIncomplete")}>
        {t("auth.linkIncompleteBody")}
      </Alert>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setErrors({});
    try {
      await accountApi.resetPassword(token, password);
      setPassword(""); // not kept once used
      router.replace("/login?reason=reset");
    } catch (e) {
      const f = fields(e);
      if (Object.keys(f).length) setErrors(f);
      else setError(describe(e));
    } finally {
      setPending(false); // always ends, also when the page is kept mounted by the router
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {error ? <Alert kind="error">{error}</Alert> : null}
      <Field
        id="newPassword"
        label={t("settings.newPassword")}
        hint={t("auth.passwordHintShort")}
        error={errors.newPassword}
      >
        {(p) => (
          <Input
            {...p}
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("common.saving") : t("settings.changePassword")}
      </Button>
    </form>
  );
}

/** Spends the one-time link from the verification email as soon as the page opens. */
export function VerifyEmailView() {
  const { t } = useT();
  const { describe } = useErrorText();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const started = useRef(false);
  const [state, setState] = useState<"working" | "done" | "failed">(
    token ? "working" : "failed",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    accountApi
      .verifyEmail(token)
      .then(() => setState("done"))
      .catch((e) => {
        setMessage(describe(e));
        setState("failed");
      });
    // describe is recreated every render; the call must run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state === "working") {
    return (
      <p role="status" className="text-muted-foreground">
        {t("auth.confirming")}
      </p>
    );
  }
  if (state === "done") {
    return (
      <Alert kind="success" title={t("auth.confirmedTitle")}>
        {t("auth.confirmedBody")}
      </Alert>
    );
  }
  return (
    <Alert kind="error" title={t("auth.linkFailedTitle")}>
      {message ?? t("auth.linkIncompleteBody")} {t("auth.linkFailedHelp")}
    </Alert>
  );
}
