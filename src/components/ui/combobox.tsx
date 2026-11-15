"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
  /** Extra text that also matches the search (for example the English name). */
  keywords?: string;
}

const control =
  "block h-11 w-full rounded-lg border border-border-strong bg-surface pr-10 pl-9 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 hover:border-foreground/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-[invalid=true]:border-danger";

/**
 * A searchable single choice (WAI-ARIA combobox with a listbox). Type to filter, arrow keys to move, Enter to choose, Escape to close.
 * Used for the few supported countries and for currencies, where a worldwide <select> would be noise.
 */
export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  disabled,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string;
  options: ComboOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText: string;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = `${id}-list`;
  const selected = options.find((o) => o.value === value) ?? null;

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  function choose(option: ComboOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && open && shown[active]) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && shown[active] ? `${id}-opt-${shown[active].value}` : undefined
        }
        aria-describedby={describedBy}
        aria-invalid={invalid}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={cn(control, "cursor-text")}
        value={open ? query : (selected?.label ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onKeyDown={onKeyDown}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-elevated p-1.5 shadow-lg"
        >
          {shown.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {emptyText}
            </li>
          ) : (
            shown.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-opt-${o.value}`}
                role="option"
                aria-selected={o.value === value}
                // mousedown (not click) so the input keeps focus until the choice is made
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm",
                  i === active && "bg-hover",
                )}
              >
                <span>{o.label}</span>
                {o.value === value ? (
                  <Check aria-hidden className="size-4 text-primary" />
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
