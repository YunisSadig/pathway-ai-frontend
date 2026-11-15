import Link from "next/link";

/** The centred card every account screen (log in, sign up, reset, verify) sits in. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="page-container grid min-h-[calc(100svh-16rem)] place-items-start py-10 sm:place-items-center sm:py-16">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-2 text-muted-foreground">{description}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-semibold text-primary-soft-foreground underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
