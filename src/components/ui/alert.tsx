import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLE = {
  info: "border-border bg-primary-soft text-foreground",
  success: "border-success/30 bg-success-soft text-foreground",
  error: "border-danger/40 bg-danger-soft text-foreground",
} as const;

const ICON = { info: Info, success: CircleCheck, error: CircleAlert } as const;
const ICON_COLOUR = {
  info: "text-primary-soft-foreground",
  success: "text-success",
  error: "text-danger",
} as const;

/** A short message. Errors use role="alert" (announced at once); the others role="status" (announced politely). */
export function Alert({
  kind = "info",
  title,
  children,
  className,
}: {
  kind?: keyof typeof STYLE;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = ICON[kind];
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        STYLE[kind],
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-5 shrink-0", ICON_COLOUR[kind])}
      />
      <div className="grid gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className="text-muted-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
