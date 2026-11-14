import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-lg border border-border-strong bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 hover:border-foreground/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-24 py-2", className)} {...props} />
  );
}
