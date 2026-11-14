"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { describeError } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import { safeNext, useSession } from "./session-provider";
import { TextLink } from "./auth-shell";

const REASONS: Record<string, { kind: "info" | "success"; text: string }> = {
  required: { kind: "info", text: "Please log in to continue." },
  expired: { kind: "info", text: "Your session ended. Please log in again." },
  deleted: { kind: "success", text: "Your account and its data were deleted." },
  reset: {
    kind: "success",
    text: "Your password was changed. You can log in now.",
  },
  verified: {
    kind: "success",
    text: "Your email address is confirmed. You can log in now.",
  },
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const { config } = useAccountConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const notice = REASONS[params.get("reason") ?? ""];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await accountApi.login({ email: email.trim(), password });
      await refresh();
      router.replace(safeNext(params.get("next")));
    } catch (e) {
      setError(describeError(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {notice ? <Alert kind={notice.kind}>{notice.text}</Alert> : null}
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
      <Field id="password" label="Password">
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
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
      {config?.emailDeliveryAvailable ? (
        <p className="text-center text-sm">
          <TextLink href="/forgot-password">Forgot your password?</TextLink>
        </p>
      ) : null}
    </form>
  );
}
