"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/components/saved/saved-provider";
import { describeError } from "@/lib/account/errors";
import type { Account } from "@/lib/account/types";

export function SavedView({ user }: { user: Account }) {
  const { items, ready, error, toggleProgram, toggleUniversity } = useSaved();
  const [problem, setProblem] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setProblem(null);
    try {
      await action();
    } catch (e) {
      setProblem(describeError(e));
    }
  }

  if (!user.catalogueAccess && !items.catalogueVisible) {
    return (
      <Alert kind="info" title="Saving opens with the university catalogue">
        The catalogue is in a protected beta and is not open to your account
        yet, so there is nothing to save. Your profile works already:{" "}
        <Link href="/profile/edit" className="font-semibold underline">
          edit it here
        </Link>
        .
      </Alert>
    );
  }
  if (!ready) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="h-48 animate-pulse rounded-xl bg-muted"
      >
        <span className="sr-only">Loading saved items…</span>
      </div>
    );
  }
  if (error)
    return (
      <Alert kind="error" title="Saved items could not be loaded">
        {error}
      </Alert>
    );

  const empty = items.programs.length === 0 && items.universities.length === 0;
  return (
    <div className="grid gap-6">
      {problem ? <Alert kind="error">{problem}</Alert> : null}
      {empty ? (
        <div className="card p-6">
          <h2 className="text-lg font-bold">Nothing saved yet</h2>
          <p className="mt-1 text-muted-foreground">
            Use the Save button on a program or university page and it will
            appear here.
          </p>
          <Button asChild className="mt-4">
            <Link href="/universities">Explore universities</Link>
          </Button>
        </div>
      ) : null}

      {items.programs.length > 0 ? (
        <section aria-labelledby="saved-programs" className="card p-6">
          <h2 id="saved-programs" className="text-lg font-bold">
            Programs
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {items.programs.map((p) => (
              <li
                key={p.identifier}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  {p.available ? (
                    <Link
                      href={`/programs/${p.identifier}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      Program no longer listed
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {p.available
                      ? p.universityName
                      : "It was withdrawn or is being re-checked, so no details are shown."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run(() => toggleProgram(p.identifier))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {items.universities.length > 0 ? (
        <section aria-labelledby="saved-universities" className="card p-6">
          <h2 id="saved-universities" className="text-lg font-bold">
            Universities
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {items.universities.map((u) => (
              <li
                key={u.slug}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  {u.available ? (
                    <Link
                      href={`/universities/${u.slug}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {u.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      University no longer listed
                    </span>
                  )}
                  {u.available && u.countryName ? (
                    <p className="text-sm text-muted-foreground">
                      {u.countryName}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => run(() => toggleUniversity(u.slug))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
