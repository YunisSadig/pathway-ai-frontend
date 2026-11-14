import Link from "next/link";
import { LogoMark } from "@/components/layout/site-header";
import { NAV, SITE } from "@/lib/site";

const COMPANY = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="page-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <LogoMark />
            {SITE.name}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            A study-abroad guide in early release. Facts come from official
            sources and are shown with where they came from.
          </p>
        </div>
        <FooterLinks title="Explore" links={NAV} />
        <FooterLinks title="Pathway AI" links={COMPANY} />
      </div>
      <div className="border-t border-border">
        <p className="page-container py-5 text-sm text-muted-foreground">
          {SITE.name} is in early release. Fees, deadlines and requirements can
          change: always confirm them on the official university website.
        </p>
      </div>
    </footer>
  );
}
