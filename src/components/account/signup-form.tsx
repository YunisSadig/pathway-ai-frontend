"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { describeError, fieldErrors } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import { useSession } from "./session-provider";

const MIN = 10;

export function SignupForm() {
  const router = useRouter();
  const { refresh } = useSession();
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (password.length < MIN)
      next.password = `Use at least ${MIN} characters.`;
    if (!agreed)
      next.agreed =
        "Please confirm that you have read the Terms and the Privacy policy.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setPending(true);
    try {
      const result = await accountApi.register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      if (result.status === "CHECK_EMAIL") {
        setCheckEmail(email.trim());
        setPending(false);
        return;
      }
      await refresh();
      router.replace("/dashboard?welcome=1");
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else setFormError(describeError(e));
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <Alert kind="success" title="Check your inbox">
        If {checkEmail} can be used, we have sent a message with the next step.
        The link works for 24 hours.
      </Alert>
    );
  }

  if (config && !config.registrationOpen) {
    return (
      <Alert kind="info" title="Sign-up is closed for now">
        New accounts are not being created at the moment. If you already have an
        account,{" "}
        <Link href="/login" className="font-semibold underline">
          log in
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {formError ? <Alert kind="error">{formError}</Alert> : null}
      <Field id="email" label="Email address" error={errors.email}>
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
        label="Name"
        optional
        hint="How we greet you. You can change it later."
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
        label="Password"
        hint={`At least ${MIN} characters. A few random words make a strong password. ${password.length}/${MIN}+`}
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
              {show ? "Hide" : "Show"}
            </Button>
          </div>
        )}
      </Field>
      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="agreed"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-invalid={errors.agreed ? true : undefined}
            aria-describedby={errors.agreed ? "agreed-error" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
          />
          <span>
            I have read the{" "}
            <Link href="/terms" className="font-semibold underline">
              Terms
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" className="font-semibold underline">
              Privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.agreed ? (
          <p id="agreed-error" className="text-sm font-medium text-danger">
            <span className="sr-only">Error: </span>
            {errors.agreed}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating your account…" : "Create your account"}
      </Button>
      {config && !config.emailDeliveryAvailable ? (
        <p className="text-sm text-muted-foreground">
          Email confirmation is not switched on yet, so your address is not
          verified. Your account still works.
        </p>
      ) : null}
    </form>
  );
}
