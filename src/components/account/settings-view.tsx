"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Avatar } from "@/components/profile/avatar-uploader";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useT, type Key, type Lang } from "@/lib/i18n";
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

function ProfileCard({ user }: { user: Account }) {
  const { t } = useT();
  const { describe } = useErrorText();
  const { refresh } = useSession();
  const [name, setName] = useState(user.displayName ?? "");
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState(false);

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
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

  return (
    <Card
      title={t("settings.profileCard")}
      description={t("settings.profileHelp")}
    >
      {notice ? (
        <Alert kind={notice.kind} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar
          present={!!user.avatar?.present}
          version={user.avatar?.version ?? 0}
          name={user.displayName ?? undefined}
          className="size-20"
        />
        <Button asChild variant="outline" size="sm">
          <Link href="/profile/edit?step=1">{t("settings.changePicture")}</Link>
        </Button>
      </div>
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
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? t("common.saving") : t("settings.saveName")}
          </Button>
          <Button asChild variant="outline">
            <Link href="/profile/edit">{t("settings.editProfile")}</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}

function EmailCard({ user }: { user: Account }) {
  const { t } = useT();
  const { describe } = useErrorText();
  const { config } = useAccountConfig();
  const [notice, setNotice] = useState<Notice>(null);

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
      <dl className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr]">
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
          <Button variant="outline" size="sm" className="mt-4" onClick={resend}>
            {t("settings.sendConfirmation")}
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("settings.confirmationOff")}
          </p>
        )
      ) : null}
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

const GOOGLE_RESULTS: Record<string, { kind: "success" | "error"; key: Key }> =
  {
    linked: { kind: "success", key: "settings.google.linked" },
    taken: { kind: "error", key: "settings.google.taken" },
    expired: { kind: "error", key: "settings.google.expired" },
    cancelled: { kind: "error", key: "settings.google.cancelled" },
    failed: { kind: "error", key: "settings.google.failed" },
  };

/** The outcome of connecting Google (a short code in the address) and the connect form, for accounts that have a password. */
function GoogleNotice() {
  const { t } = useT();
  const result = GOOGLE_RESULTS[useSearchParams().get("google") ?? ""];
  return result ? <Alert kind={result.kind}>{t(result.key)}</Alert> : null;
}

function GoogleCard({ user }: { user: Account }) {
  const { t } = useT();
  const { describe } = useErrorText();
  const { config } = useAccountConfig();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const linked = user.providers?.includes("GOOGLE") ?? false;
  if (!linked && !config?.googleLoginAvailable) return null;

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setProblem(null);
    try {
      const { url } = await accountApi.allowGoogleLink(password);
      setPassword("");
      window.location.assign(url); // the trip to Google and back is a full-page navigation
    } catch (e) {
      setProblem(describe(e));
      setPending(false);
    }
  }

  return (
    <Card title={t("settings.googleTitle")}>
      {user.hasPassword === false ? (
        <p className="text-sm">{t("settings.googleOnly")}</p>
      ) : linked ? (
        <p className="text-sm">{t("settings.googleLinked")}</p>
      ) : (
        <form onSubmit={connect} className="grid max-w-md gap-3">
          <p className="text-sm text-muted-foreground">
            {t("settings.googleHelp")}
          </p>
          {problem ? <Alert kind="error">{problem}</Alert> : null}
          <Field id="googlePassword" label={t("settings.currentPassword")}>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <div>
            <Button
              type="submit"
              variant="outline"
              disabled={pending || !password}
            >
              {t("settings.googleConnect")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

type Section = "profile" | "security" | "appearance";
const SECTIONS: { id: Section; label: Key }[] = [
  { id: "profile", label: "settings.secProfile" },
  { id: "security", label: "settings.secSecurity" },
  { id: "appearance", label: "settings.secAppearance" },
];

/**
 * Three sections, one at a time (the address keeps the choice: ?section=profile|security|appearance). Appearance and language work for
 * everyone because they only change this browser; Profile and Account & Security need a session. Password management lives only under
 * Account & Security.
 */
export function SettingsView() {
  const { t } = useT();
  const { state } = useSession();
  const search = useSearchParams();
  const user = state.status === "authenticated" ? state.user : null;
  const asked = search.get("section");
  const section: Section =
    SECTIONS.find((x) => x.id === asked && (user || x.id === "appearance"))
      ?.id ?? (user ? "profile" : "appearance");
  const visible = user
    ? SECTIONS
    : SECTIONS.filter((x) => x.id === "appearance");
  return (
    <div className="grid gap-6 md:grid-cols-[13rem_1fr] md:items-start">
      <nav
        aria-label={t("settings.navLabel")}
        className="flex flex-wrap gap-2 md:sticky md:top-24 md:flex-col md:gap-1"
      >
        {visible.map((x) => (
          <Link
            key={x.id}
            href={`/settings?section=${x.id}`}
            scroll={false}
            aria-current={section === x.id ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              section === x.id
                ? "bg-primary-soft text-primary-soft-foreground"
                : "text-muted-foreground hover:bg-hover hover:text-foreground"
            }`}
          >
            {t(x.label)}
          </Link>
        ))}
      </nav>
      <div className="grid max-w-3xl gap-6">
        {section === "appearance" ? (
          <>
            <AppearanceCard />
            <LanguageCard signedIn={!!user} />
          </>
        ) : null}
        {user && section === "profile" ? <ProfileCard user={user} /> : null}
        {user && section === "security" ? (
          <>
            <GoogleNotice />
            <EmailCard user={user} />
            <GoogleCard user={user} />
            {user.hasPassword === false ? null : <PasswordCard />}
            <DataCard />
            {user.hasPassword === false ? (
              <Alert kind="info">{t("settings.googleNoDelete")}</Alert>
            ) : (
              <DeleteCard />
            )}
          </>
        ) : null}
        {!user && state.status === "anonymous" ? (
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
    </div>
  );
}
