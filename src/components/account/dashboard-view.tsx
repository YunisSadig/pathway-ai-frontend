"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Bookmark, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSaved } from "@/components/saved/saved-provider";
import { profileCompleteness } from "@/lib/account/profile-completeness";
import type { Account } from "@/lib/account/types";
import { useProfile } from "@/lib/account/use-profile";

export function DashboardView({ user }: { user: Account }) {
  const params = useSearchParams();
  const { state } = useProfile();
  const { items, ready } = useSaved();
  const profile = state.status === "ready" ? state.profile : null;
  const done = profileCompleteness(profile);
  const percent = Math.round((done.filled / done.total) * 100);
  const first = user.displayName?.split(" ")[0];

  return (
    <div className="grid gap-6">
      {params.get("welcome") ? (
        <Alert kind="success" title={`Welcome${first ? `, ${first}` : ""}!`}>
          Your account is ready. A good first step is to tell us a little about
          your studies.
        </Alert>
      ) : null}
      {!user.emailVerified ? (
        <Alert kind="info" title="Your email address is not confirmed">
          {`You can use Pathway AI as normal. Confirming your address lets us reach you if you forget your password; see Settings.`}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <section
          aria-labelledby="profile-title"
          className="flex h-full flex-col card p-6 lg:col-span-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="profile-title" className="text-lg font-bold">
                Your profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.status === "loading"
                  ? "Loading…"
                  : `${done.filled} of ${done.total} details provided`}
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground"
            >
              <UserRound className="size-5" />
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Profile details provided"
            aria-valuemin={0}
            aria-valuemax={done.total}
            aria-valuenow={done.filled}
            className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          {done.missing.length > 0 && state.status === "ready" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Still open: {done.missing.slice(0, 3).join(", ")}
              {done.missing.length > 3
                ? ` and ${done.missing.length - 3} more`
                : ""}
              . Everything is optional.
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-3 pt-6">
            <Button asChild>
              <Link href="/profile/edit">
                {done.filled === 0 ? "Start your profile" : "Edit profile"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile">View profile</Link>
            </Button>
          </div>
        </section>

        <section
          aria-labelledby="saved-title"
          className="flex h-full flex-col card p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="saved-title" className="text-lg font-bold">
              Saved
            </h2>
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground"
            >
              <Bookmark className="size-5" />
            </span>
          </div>
          {user.catalogueAccess ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {ready
                ? `${items.programs.length} programs · ${items.universities.length} universities`
                : "Loading…"}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Saving programs opens with the university catalogue, which is in a
              protected beta.
            </p>
          )}
          <Button asChild variant="outline" className="mt-auto self-start">
            <Link href="/saved">Open saved</Link>
          </Button>
        </section>
      </div>

      <section aria-labelledby="status-title" className="card p-6">
        <h2 id="status-title" className="text-lg font-bold">
          What is available to you
        </h2>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {[
            {
              name: "Your profile and preferences",
              status: "verified",
              label: "Available",
            },
            {
              name: "University discovery",
              status: user.catalogueAccess ? "verified" : "hypothetical",
              label: user.catalogueAccess
                ? "Available to you"
                : "Protected beta",
            },
            { name: "Scholarships", status: "neutral", label: "Coming soon" },
            {
              name: "Personalized matching",
              status: "neutral",
              label: "Coming soon",
            },
          ].map((row) => (
            <li
              key={row.name}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <span className="font-medium">{row.name}</span>
              <StatusBadge
                status={row.status as "verified" | "hypothetical" | "neutral"}
              >
                {row.label}
              </StatusBadge>
            </li>
          ))}
        </ul>
        {user.catalogueAccess ? (
          <Button asChild variant="link" size="link" className="mt-3">
            <Link href="/universities">
              Explore universities <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : null}
      </section>
    </div>
  );
}
