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
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";

export const ACCOUNT_LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/profile", label: "Profile", Icon: UserRound },
  { href: "/saved", label: "Saved", Icon: Bookmark },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

function initialOf(name: string | null, email: string): string {
  return (name?.trim() || email).charAt(0).toUpperCase();
}

/** Log in and Sign up for visitors; an account menu for a signed-in student. Space is reserved while the session is read. */
export function AuthActions() {
  const { state, logout } = useSession();
  const router = useRouter();

  if (state.status === "loading") {
    return (
      <div
        aria-hidden
        className="h-9 w-24 animate-pulse rounded-lg bg-muted sm:w-40"
      />
    );
  }

  if (state.status === "anonymous") {
    return (
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  const { user } = state;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface pr-2 pl-1.5 transition-colors duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-md bg-primary-soft text-sm font-bold text-primary-soft-foreground"
        >
          {initialOf(user.displayName, user.email)}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">
          {user.displayName || user.email.split("@")[0]}
        </span>
        <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">
              {user.displayName || "Your account"}
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
                {label}
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
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** The same actions inside the mobile menu. */
export function MobileAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { state, logout } = useSession();
  const router = useRouter();
  if (state.status === "loading") return null;
  if (state.status === "anonymous") {
    return (
      <div className="grid gap-2 border-t border-border pt-4">
        <Button asChild size="lg">
          <Link href="/signup" onClick={onNavigate}>
            Sign up
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login" onClick={onNavigate}>
            Log in
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
            {label}
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
          Log out
        </button>
      </li>
    </ul>
  );
}
