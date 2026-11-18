"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useSyncExternalStore } from "react";
import { hadSession, useSession } from "@/components/account/session-provider";
import { Avatar } from "@/components/profile/avatar-uploader";
import { Button } from "@/components/ui/button";
import { useT, type Key } from "@/lib/i18n";

const noSubscription = () => () => {};

export const ACCOUNT_LINKS = [
  { href: "/dashboard", label: "nav.dashboard" as Key, Icon: LayoutDashboard },
  { href: "/profile", label: "nav.profile" as Key, Icon: UserRound },
  { href: "/saved", label: "nav.saved" as Key, Icon: Bookmark },
  { href: "/settings", label: "nav.settings" as Key, Icon: Settings },
] as const;

function initialOf(name: string | null, email: string): string {
  return (name?.trim() || email).charAt(0).toUpperCase();
}

/** Log in and Sign up for visitors; an account menu for a signed-in student. Space is reserved while the session is read. */
export function AuthActions() {
  const { t } = useT();
  const { state, logout } = useSession();
  const router = useRouter();
  const hint = useSyncExternalStore(
    noSubscription,
    () => (hadSession() ? "had-session" : "none"),
    () => "ssr" as const,
  );

  // Before the session answer arrives (or while the API is waking up): a browser that was signed in last time sees a neutral
  // "restoring" control, every other visitor sees Log in / Sign up at once. Only the server's answer changes the real state.
  const pending =
    state.status === "loading" ||
    (state.status === "anonymous" && state.serviceError);
  if (pending && hint === "ssr") {
    return (
      <div
        aria-hidden
        className="h-9 w-12 rounded-lg bg-muted min-[400px]:w-24 sm:w-40"
      />
    );
  }
  if (pending && hint === "had-session") {
    return (
      <span
        role="status"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground"
      >
        <span
          aria-hidden
          className="size-2 animate-pulse rounded-full bg-primary"
        />
        <span className="hidden min-[400px]:inline">
          {t("nav.restoringAccount")}
        </span>
        <span className="sr-only min-[400px]:hidden">
          {t("nav.restoringAccount")}
        </span>
      </span>
    );
  }

  if (state.status !== "authenticated") {
    return (
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/login">{t("auth.login")}</Link>
        </Button>
        <Button asChild size="sm" className="hidden min-[400px]:inline-flex">
          <Link href="/signup">{t("auth.signup")}</Link>
        </Button>
      </div>
    );
  }

  const { user } = state;
  return (
    <DropdownMenu.Root>
      {/* the accessible name comes from the button's own text (the visible name, then a hidden "Account menu"), so what is
          read out always contains what is shown (WCAG 2.5.3 label in name) */}
      <DropdownMenu.Trigger className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface pr-1.5 pl-1.5 transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:pr-2">
        {user.avatar?.present ? (
          <Avatar
            present
            version={user.avatar.version}
            name={user.displayName ?? undefined}
            className="size-8"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-foreground"
          >
            {initialOf(user.displayName, user.email)}
          </span>
        )}
        <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">
          {user.displayName || user.email.split("@")[0]}
        </span>
        <span className="sr-only">
          <span className="hidden sm:inline">, </span>
          {t("nav.accountMenu")}
        </span>
        <ChevronDown
          aria-hidden
          className="hidden size-4 text-muted-foreground sm:block"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">
              {user.displayName || t("nav.yourAccount")}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {ACCOUNT_LINKS.map(({ href, label, Icon }) => (
            <DropdownMenu.Item key={href} asChild>
              <Link
                href={href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none data-[highlighted]:bg-hover"
              >
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {t(label)}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={async () => {
              await logout();
              router.replace("/");
            }}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none data-[highlighted]:bg-hover"
          >
            <LogOut aria-hidden className="size-4 text-muted-foreground" />
            {t("nav.logout")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The same actions inside the mobile menu. */
export function MobileAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useT();
  const { state, logout } = useSession();
  const router = useRouter();
  if (state.status === "loading") return null;
  if (state.status === "anonymous") {
    return (
      <div className="grid gap-2 border-t border-border pt-4">
        <Button asChild size="lg">
          <Link href="/signup" onClick={onNavigate}>
            {t("auth.signup")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login" onClick={onNavigate}>
            {t("auth.login")}
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <ul className="grid gap-1 border-t border-border pt-4">
      {ACCOUNT_LINKS.map(({ href, label, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <Icon aria-hidden className="size-5" />
            {t(label)}
          </Link>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={async () => {
            onNavigate();
            await logout();
            router.replace("/");
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-base font-medium text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
        >
          <LogOut aria-hidden className="size-5" />
          {t("nav.logout")}
        </button>
      </li>
    </ul>
  );
}
