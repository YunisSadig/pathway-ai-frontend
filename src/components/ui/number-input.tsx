"use client";

import * as React from "react";
import { Input } from "./input";

/** Parses what a person types: both "3.5" and "3,5" (Russian-style) are accepted. Empty or invalid text is null. */
export function parseDecimal(text: string): number | null {
  const normalised = text.trim().replace(/\s+/g, "").replace(",", ".");
  if (normalised === "" || !/^-?\d*\.?\d*$/.test(normalised)) return null;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

/**
 * A text input for numbers that keeps what is being typed ("3." or "3,") while the parent only ever sees a number or null.
 * `inputMode="decimal"` opens the numeric keypad on phones.
 */
export function NumberInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
}) {
  const [text, setText] = React.useState(value === null ? "" : String(value));
  // follow outside changes (for example a reset) without fighting the person's typing
  const [seen, setSeen] = React.useState(value);
  if (value !== seen) {
    setSeen(value);
    if (parseDecimal(text) !== value)
      setText(value === null ? "" : String(value));
  }
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onValueChange(parseDecimal(e.target.value));
      }}
    />
  );
}
