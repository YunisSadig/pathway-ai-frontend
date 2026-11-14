"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/account/api";
import { describeError, fieldErrors } from "@/lib/account/errors";
import { useAccountConfig } from "@/lib/account/use-account-config";
import type { Account } from "@/lib/account/types";
import { ApiError } from "@/lib/api/client";
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

function AccountCard({ user }: { user: Account }) {
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
      setNotice({ kind: "success", text: "Your name was saved." });
    } catch (e) {
      setNotice({ kind: "error", text: describeError(e) });
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setNotice(null);
    try {
      await accountApi.resendVerification(user.email);
      setNotice({
        kind: "success",
        text: "If your address is not confirmed yet, we sent a new link.",
      });
    } catch (e) {
      setNotice({ kind: "error", text: describeError(e) });
    }
  }

  return (
    <Card title="Account">
      {notice ? (
        <Alert kind={notice.kind} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <dl className="grid gap-1 pb-4 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="font-semibold text-muted-foreground">Email address</dt>
        <dd>
          {user.email}{" "}
          <span className="text-muted-foreground">
            ({user.emailVerified ? "confirmed" : "not confirmed"})
          </span>
        </dd>
      </dl>
      {!user.emailVerified ? (
        config?.emailDeliveryAvailable ? (
          <Button variant="outline" size="sm" className="mb-4" onClick={resend}>
            Send a confirmation email
          </Button>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">
            Email confirmation is not switched on yet.
          </p>
        )
      ) : null}
      <form onSubmit={saveName} className="grid max-w-md gap-3">
        <Field id="displayName" label="Name" optional>
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
            {pending ? "Saving…" : "Save name"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
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
      setNotice({
        kind: "success",
        text: "Your password was changed. Other devices were logged out.",
      });
    } catch (e) {
      const fields = fieldErrors(e);
      if (Object.keys(fields).length) setErrors(fields);
      else setNotice({ kind: "error", text: describeError(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      title="Password"
      description="Changing it logs you out on every other device."
    >
      {notice ? (
        <Alert kind={notice.kind} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <form onSubmit={submit} className="grid max-w-md gap-4">
        <Field id="currentPassword" label="Current password">
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
          label="New password"
          hint="At least 10 characters."
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
            {pending ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DataCard() {
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
      setNotice({ kind: "error", text: describeError(e) });
    }
  }

  async function clearProfile() {
    try {
      await accountApi.clearProfile();
      setConfirmClear(false);
      setNotice({
        kind: "success",
        text: "Your profile details were removed. Your account is unchanged.",
      });
    } catch (e) {
      setNotice({ kind: "error", text: describeError(e) });
    }
  }

  async function logoutEverywhere() {
    try {
      await accountApi.logoutEverywhere();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        setNotice({ kind: "error", text: describeError(e) });
        return;
      }
    }
    expire();
    router.replace("/login?reason=expired");
  }

  return (
    <Card title="Your data" description="You decide what Pathway AI keeps.">
      {notice ? (
        <Alert kind={notice.kind} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={exportData}>
          Download my data
        </Button>
        {confirmClear ? (
          <>
            <Button variant="outline" onClick={clearProfile}>
              Yes, remove my profile details
            </Button>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setConfirmClear(true)}>
            Clear my profile
          </Button>
        )}
        <Button variant="outline" onClick={logoutEverywhere}>
          Log out on all devices
        </Button>
      </div>
    </Card>
  );
}

function DeleteCard() {
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
      setError(describeError(e));
      setPending(false);
    }
  }

  return (
    <section
      aria-label="Delete account"
      className="rounded-xl border border-danger/40 p-6"
    >
      <h2 className="text-lg font-bold">Delete your account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This removes your account, your profile, your saved items and every
        active session. It cannot be undone.
      </p>
      {open ? (
        <form onSubmit={submit} className="mt-4 grid max-w-md gap-4">
          {error ? <Alert kind="error">{error}</Alert> : null}
          <Field id="deletePassword" label="Enter your password to confirm">
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
              {pending ? "Deleting…" : "Delete my account permanently"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          className="mt-4 border-danger/50 text-danger"
          onClick={() => setOpen(true)}
        >
          Delete account…
        </Button>
      )}
    </section>
  );
}

export function SettingsView({ user }: { user: Account }) {
  return (
    <div className="grid max-w-3xl gap-5">
      <AccountCard user={user} />
      <PasswordCard />
      <DataCard />
      <DeleteCard />
    </div>
  );
}
