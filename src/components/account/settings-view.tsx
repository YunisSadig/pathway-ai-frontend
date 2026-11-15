"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { useErrorText } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import type { Account } from "@/lib/account/types";
import { ApiError } from "@/lib/api/client";
import { useT, type Lang } from "@/lib/i18n";
import { profileApi } from "@/lib/profile/api";
import { useSession } from "./session-provider";

type Notice = { kind: "success" | "error"; text: string } | null;

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="card p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const subscribe = () => () => {};

/** System follows the operating system and keeps following it; Light and Dark are explicit choices that are remembered in this browser. */
function AppearanceCard() {
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  // the stored theme is only known on the client
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <Card
      title={t("settings.appearance")}
      description={t("settings.appearanceHelp")}
    >
      <ChoiceGroup<"system" | "light" | "dark">
        name="theme"
        label={t("settings.theme")}
        value={
          mounted
            ? ((theme as "system" | "light" | "dark" | undefined) ?? "system")
            : null
        }
        columns={3}
        onChange={setTheme}
        choices={[
          {
            value: "system",
            label: t("settings.themeSystem"),
            description: t("settings.themeSystemHelp"),
          },
          { value: "light", label: t("settings.themeLight") },
          { value: "dark", label: t("settings.themeDark") },
        ]}
      />
    </Card>
  );
}

function LanguageCard({ signedIn }: { signedIn: boolean }) {
  const { t, lang, setLang } = useT();
  const [failed, setFailed] = useState(false);
  async function choose(next: Lang) {
    setLang(next);
    setFailed(false);
    if (!signedIn) return;
    try {
      await profileApi.setLanguage(next);
    } catch {
      setFailed(true); // the choice still works in this browser
    }
  }
  return (
    <Card
      title={t("settings.language")}
      description={t("settings.languageHelp")}
    >
      <ChoiceGroup<Lang>
        name="language"
        label={t("settings.languageLabel")}
        value={lang}
        columns={2}
        onChange={choose}
        choices={[
          { value: "en", label: "English" },
          { value: "ru", label: "Русский" },
        ]}
      />
      {failed ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("settings.languageNotSynced")}
        </p>
      ) : null}
    </Card>
  );
}

function AccountCard({ user }: { user: Account }) {
  const { t } = useT();
  const { describe } = useErrorText();
  const { refresh } = useSession();
  const { config } = useAccountConfig();
  const [name, setName] = useState(user.displayName ?? "");
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState(false);

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      await accountApi.updateDisplayName(name);
      await refresh();
      setNotice({ kind: "success", text: t("settings.nameSaved") });
    } catch (e) {
      setNotice({ kind: "error", text: describe(e) });
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setNotice(null);
    try {
      await accountApi.resendVerification(user.email);
      setNotice({ kind: "success", text: t("settings.verificationSent") });
    } catch (e) {
      setNotice({ kind: "error", text: describe(e) });
    }
  }

  return (
    <Card title={t("settings.account")}>
      {notice ? (
        <Alert kind={notice.kind} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <dl className="grid gap-1 pb-4 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="font-semibold text-muted-foreground">
          {t("settings.email")}
        </dt>
        <dd>
          {user.email}{" "}
          <span className="text-muted-foreground">
            (
            {user.emailVerified
              ? t("settings.confirmed")
              : t("settings.notConfirmed")}
            )
          </span>
        </dd>
      </dl>
      {!user.emailVerified ? (
        config?.emailDeliveryAvailable ? (
          <Button variant="outline" size="sm" className="mb-4" onClick={resend}>
            {t("settings.sendConfirmation")}
          </Button>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            {t("settings.confirmationOff")}
          </p>
        )
      ) : null}
      <form onSubmit={saveName} className="grid max-w-md gap-3">
        <Field id="displayName" label={t("bg.name")} optional>
          {(p) => (
            <Input
              {...p}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? t("common.saving") : t("settings.saveName")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { t } = useT();
  const { describe, fields } = useErrorText();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    setErrors({});
    try {
      await accountApi.changePassword(current, next);
      setCurrent("");
      setNext("");
      setNotice({ kind: "success", text: t("settings.passwordChanged") });
    } catch (e) {
      const f = fields(e);
      if (Object.keys(f).length) setErrors(f);
      else setNotice({ kind: "error", text: describe(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      title={t("settings.password")}
      description={t("settings.passwordHelp")}
    >
      {notice ? (
        <Alert kind={notice.kind} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <form onSubmit={submit} className="grid max-w-md gap-4">
        <Field id="currentPassword" label={t("settings.currentPassword")}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          )}
        </Field>
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
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          )}
        </Field>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? t("common.saving") : t("settings.changePassword")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DataCard() {
  const { t } = useT();
  const { describe } = useErrorText();
  const router = useRouter();
  const { expire } = useSession();
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function exportData() {
    setNotice(null);
    try {
      const data = await accountApi.exportData();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "pathway-ai-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setNotice({ kind: "error", text: describe(e) });
    }
  }

  async function clearProfile() {
    try {
      await accountApi.clearProfile();
      setConfirmClear(false);
      setNotice({ kind: "success", text: t("settings.profileCleared") });
    } catch (e) {
      setNotice({ kind: "error", text: describe(e) });
    }
  }

  async function logoutEverywhere() {
    try {
      await accountApi.logoutEverywhere();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        setNotice({ kind: "error", text: describe(e) });
        return;
      }
    }
    expire();
    router.replace("/login?reason=expired");
  }

  return (
    <Card title={t("settings.privacy")} description={t("settings.privacyHelp")}>
      {notice ? (
        <Alert kind={notice.kind} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <p className="mb-4 text-sm text-muted-foreground">
        {t("settings.trainingNote")}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={exportData}>
          {t("settings.download")}
        </Button>
        {confirmClear ? (
          <>
            <Button variant="outline" onClick={clearProfile}>
              {t("settings.confirmClear")}
            </Button>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              {t("common.cancel")}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setConfirmClear(true)}>
            {t("settings.clear")}
          </Button>
        )}
        <Button variant="outline" onClick={logoutEverywhere}>
          {t("settings.logoutAll")}
        </Button>
      </div>
    </Card>
  );
}

function DeleteCard() {
  const { t } = useT();
  const { describe } = useErrorText();
  const router = useRouter();
  const { expire } = useSession();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await accountApi.deleteAccount(password);
      expire(true);
      router.replace("/login?reason=deleted");
    } catch (e) {
      setError(describe(e));
      setPending(false);
    }
  }

  return (
    <section
      aria-label={t("settings.deleteAccount")}
      className="rounded-xl border border-danger/40 p-6"
    >
      <h2 className="text-lg font-bold">{t("settings.deleteTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("settings.deleteHelp")}
      </p>
      {open ? (
        <form onSubmit={submit} className="mt-4 grid max-w-md gap-4">
          {error ? <Alert kind="error">{error}</Alert> : null}
          <Field
            id="deletePassword"
            label={t("settings.deleteConfirmPassword")}
          >
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={pending || !password}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {pending ? t("settings.deleting") : t("settings.deleteForever")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          className="mt-4 border-danger/50 text-danger"
          onClick={() => setOpen(true)}
        >
          {t("settings.deleteOpen")}
        </Button>
      )}
    </section>
  );
}

/** Appearance and language work for everyone (they only change this browser); the account, privacy and deletion cards need a session. */
export function SettingsView() {
  const { t } = useT();
  const { state } = useSession();
  const user = state.status === "authenticated" ? state.user : null;
  return (
    <div className="grid max-w-3xl gap-6">
      <AppearanceCard />
      <LanguageCard signedIn={!!user} />
      {user ? (
        <>
          <AccountCard user={user} />
          <PasswordCard />
          <DataCard />
          <DeleteCard />
        </>
      ) : state.status === "anonymous" ? (
        <Alert kind="info" title={t("settings.loginTitle")}>
          {t("settings.loginBody")}{" "}
          <Link
            href="/login?next=%2Fsettings"
            className="font-semibold underline"
          >
            {t("auth.login")}
          </Link>
        </Alert>
      ) : null}
    </div>
  );
}
