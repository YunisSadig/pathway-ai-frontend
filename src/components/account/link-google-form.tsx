"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { accountApi } from "@/lib/account/api";
import { useErrorText } from "@/lib/account/errors";
import { useT } from "@/lib/i18n";
import { TextLink } from "./auth-shell";
import { safeNext, useSession } from "./session-provider";

type Stage =
  { name: "loading" } | { name: "ready"; email: string } | { name: "expired" };

/**
 * The one-time proof that a Google sign-in belongs to an existing Pathway AI account: the visitor has just proved the Google address,
 * and now enters the account's password once. The server decides everything; this page only asks and shows the outcome. The password is
 * cleared as soon as it has been sent, and a double submit sends once.
 */
export function LinkGoogleForm() {
  const { t } = useT();
  const { describe } = useErrorText();
  const router = useRouter();
  const { refresh } = useSession();
  const [stage, setStage] = useState<Stage>({ name: "loading" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let alive = true;
    accountApi
      .pendingGoogleLink()
      .then((r) => alive && setStage({ name: "ready", email: r.email }))
      .catch(() => alive && setStage({ name: "expired" }));
    return () => {
      alive = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!password) {
      setError(t("auth.enterBoth"));
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const { next } = await accountApi.confirmGoogleLink(password);
      setPassword("");
      await refresh(); // the navigation bar shows this account straight away
      router.replace(safeNext(next));
    } catch (e) {
      setPassword("");
      if (e instanceof ApiError && e.status === 410) {
        setStage({ name: "expired" }); // too many misses, or the ten minutes ended
      } else if (e instanceof ApiError && e.status === 409) {
        setError(t("auth.link.taken"));
      } else {
        setError(describe(e));
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (stage.name === "loading") return <div className="h-48" aria-hidden />;

  if (stage.name === "expired") {
    return (
      <div className="grid gap-5">
        <Alert kind="info">{t("auth.link.expired")}</Alert>
        <Button asChild size="lg">
          <a href="/login">{t("auth.login")}</a>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-5"
      aria-busy={pending}
    >
      <Alert kind="info">
        {t("auth.link.explain", { email: stage.email })}
      </Alert>
      {error ? <Alert kind="error">{error}</Alert> : null}
      <Field id="link-password" label={t("auth.password")}>
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
        {pending ? t("auth.link.connecting") : t("auth.link.submit")}
      </Button>
      <p className="text-center text-sm">
        <TextLink href="/login">{t("auth.link.cancel")}</TextLink>
      </p>
    </form>
  );
}
