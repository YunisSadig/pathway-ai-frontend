"use client";

import { RadioGroup } from "radix-ui";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface Choice<V extends string> {
  value: V;
  label: string;
  description?: string;
}

/**
 * A group of radio choices drawn as cards: one question, a few clear answers, keyboard operable (arrow keys), with the question as the
 * accessible group label. Radix supplies the roving focus and the ARIA roles.
 */
export function ChoiceGroup<V extends string>({
  label,
  value,
  onChange,
  choices,
  error,
  hint,
  columns = 2,
  name,
}: {
  label: string;
  value: V | null;
  onChange: (value: V) => void;
  choices: Choice<V>[];
  error?: string | null;
  hint?: string;
  columns?: 1 | 2 | 3 | 4;
  name: string;
}) {
  const { t } = useT();
  const labelId = `${name}-label`;
  const errorId = `${name}-error`;
  return (
    <div className="grid gap-2">
      <p id={labelId} className="text-sm font-semibold">
        {label}
      </p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <RadioGroup.Root
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        value={value ?? ""}
        onValueChange={(v) => onChange(v as V)}
        className={cn(
          "grid gap-2.5",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-3",
          columns === 4 && "grid-cols-2 lg:grid-cols-4",
        )}
      >
        {choices.map((c) => (
          <RadioGroup.Item
            key={c.value}
            value={c.value}
            className="group flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border-strong bg-surface p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150 hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=checked]:border-primary data-[state=checked]:bg-selected data-[state=checked]:shadow-[0_0_0_1px_var(--primary)]"
          >
            <span
              aria-hidden
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-border-strong group-data-[state=checked]:border-primary"
            >
              <RadioGroup.Indicator className="size-2.5 rounded-full bg-primary" />
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-semibold">{c.label}</span>
              {c.description ? (
                <span className="text-sm text-muted-foreground">
                  {c.description}
                </span>
              ) : null}
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          <span className="sr-only">{t("common.error")}: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
