"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { useErrorText } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import { useT, type Key } from "@/lib/i18n";
import { TextLink } from "./auth-shell";
import { safeNext, useSession } from "./session-provider";

const REASONS: Record<string, { kind: "info" | "success"; key: Key }> = {
  required: { kind: "info", key: "auth.reason.required" },
  expired: { kind: "info", key: "auth.reason.expired" },
  deleted: { kind: "success", key: "auth.reason.deleted" },
  reset: { kind: "success", key: "auth.reason.reset" },
  verified: { kind: "success", key: "auth.reason.verified" },
};

export function LoginForm() {
  const { t } = useT();
  const { describe } = useErrorText();
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
      setError(t("auth.enterBoth"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await accountApi.login({ email: email.trim(), password });
      await refresh();
      router.replace(safeNext(params.get("next")));
    } catch (e) {
      setError(describe(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
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
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("auth.loggingIn") : t("auth.login")}
      </Button>
      {config?.emailDeliveryAvailable ? (
        <p className="text-center text-sm">
          <TextLink href="/forgot-password">{t("auth.forgot")}</TextLink>
        </p>
      ) : null}
    </form>
  );
}
