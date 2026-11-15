"use client";

import * as React from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * A label, a control, an optional hint and an error, wired together for assistive technology: the label is bound to the control, the
 * hint and the error are announced with it, and an error is never conveyed by colour alone (it has text and an icon-free "Error:" prefix
 * for screen readers).
 */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  className?: string;
  /** Render function so the control receives the right id and aria attributes. */
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => React.ReactNode;
}) {
  const { t } = useT();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground">
            ({t("common.optional")})
          </span>
        ) : null}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          <span className="sr-only">{t("common.error")}: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
