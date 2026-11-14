"use client";

import { useEffect, useState } from "react";

/** After this long the wait is no longer normal: say why instead of showing an unexplained skeleton. */
const SLOW_AFTER_MS = 6_000;

/**
 * Skeleton placeholder for a list that is still loading. The hosted data service runs on a free plan that sleeps when idle and
 * needs up to about 90 seconds to wake: after a few seconds the skeleton says so (and announces it politely to screen readers).
 */
export function LoadingState({
  label = "Loading",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" aria-busy="true" className="grid gap-3">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="h-24 animate-pulse rounded-xl bg-muted"
        />
      ))}
      {slow ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          This is taking longer than usual. The data service may be waking up
          after a quiet period; it can take up to two minutes. Please keep this
          page open.
        </p>
      ) : null}
    </div>
  );
}
