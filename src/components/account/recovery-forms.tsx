"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { describeError, fieldErrors } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import { ApiError } from "@/lib/api/client";

/** "Forgot your password": answers the same for every address, and says plainly when email is not available yet. */
export function ForgotPasswordForm() {
  const { config } = useAccountConfig();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (config && !config.emailDeliveryAvailable) {
    return (
      <Alert kind="info" title="Not available yet">
        Resetting a password by email is not switched on yet. If you cannot log
        in, contact us through the Contact page and we will help.
      </Alert>
    );
  }
  if (sent) {
    return (
      <Alert kind="success" title="Check your inbox">
        If that address has an account, we have sent a link to choose a new
        password. It works for one hour.
      </Alert>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await accountApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(describeError(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {error ? <Alert kind="error">{error}</Alert> : null}
      <Field id="email" label="Email address">
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
        {pending ? "Sending…" : "Send the link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <Alert kind="error" title="This link is incomplete">
        Open the link from the email again, or request a new one.
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
      router.replace("/login?reason=reset");
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else setError(describeError(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {error ? <Alert kind="error">{error}</Alert> : null}
      <Field
        id="newPassword"
        label="New password"
        hint="At least 10 characters."
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
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}

/** Spends the one-time link from the verification email as soon as the page opens. */
export function VerifyEmailView() {
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
        setMessage(e instanceof ApiError ? e.message : describeError(e));
        setState("failed");
      });
  }, [token]);

  if (state === "working") {
    return (
      <p role="status" className="text-muted-foreground">
        Confirming your email address…
      </p>
    );
  }
  if (state === "done") {
    return (
      <Alert kind="success" title="Email confirmed">
        Thank you. Your email address is now confirmed.
      </Alert>
    );
  }
  return (
    <Alert kind="error" title="This link did not work">
      {message ?? "The link is incomplete."} Log in and request a new one from
      Settings.
    </Alert>
  );
}
