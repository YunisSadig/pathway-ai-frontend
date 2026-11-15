"use client";

import Link from "next/link";
import { LogoMark } from "@/components/layout/site-header";
import { useT, type Key } from "@/lib/i18n";
import { NAV, SITE } from "@/lib/site";

const COMPANY: { key: Key; href: string }[] = [
  { key: "footer.about", href: "/about" },
  { key: "footer.privacy", href: "/privacy" },
  { key: "footer.terms", href: "/terms" },
  { key: "footer.contact", href: "/contact" },
  { key: "footer.settings", href: "/settings" },
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
  const { t } = useT();
  return (
    <footer className="border-t border-border bg-muted">
      <div className="page-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <LogoMark />
            {SITE.name}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("footer.blurb")}
          </p>
        </div>
        <FooterLinks
          title={t("footer.explore")}
          links={NAV.map((n) => ({ label: t(n.labelKey), href: n.href }))}
        />
        <FooterLinks
          title={SITE.name}
          links={COMPANY.map((c) => ({ label: t(c.key), href: c.href }))}
        />
      </div>
      <div className="border-t border-border">
        <p className="page-container py-5 text-sm text-muted-foreground">
          {t("footer.disclaimer")}
        </p>
      </div>
    </footer>
  );
}
