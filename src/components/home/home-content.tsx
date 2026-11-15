"use client";

import Link from "next/link";
import { Award, Bookmark, GraduationCap, Target } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { useT, type Key } from "@/lib/i18n";

const HOW: { title: Key; body: Key }[] = [
  { title: "how.1.title", body: "how.1.body" },
  { title: "how.2.title", body: "how.2.body" },
  { title: "how.3.title", body: "how.3.body" },
];

const FEATURES: {
  title: Key;
  body: Key;
  Icon: typeof GraduationCap;
  status: Status;
  label: Key;
}[] = [
  {
    title: "feat.discovery.title",
    body: "feat.discovery.body",
    Icon: GraduationCap,
    status: "hypothetical",
    label: "badge.beta",
  },
  {
    title: "feat.saved.title",
    body: "feat.saved.body",
    Icon: Bookmark,
    status: "hypothetical",
    label: "badge.beta",
  },
  {
    title: "feat.scholarships.title",
    body: "feat.scholarships.body",
    Icon: Award,
    status: "neutral",
    label: "badge.soon",
  },
  {
    title: "feat.matching.title",
    body: "feat.matching.body",
    Icon: Target,
    status: "neutral",
    label: "badge.soon",
  },
];

const TRUST: Key[] = ["trust.1", "trust.2", "trust.3", "trust.4"];

export function HomeContent() {
  const { t } = useT();
  return (
    <>
      <Hero />

      <section
        aria-labelledby="how-title"
        className="border-y border-border bg-muted section-y"
      >
        <div className="page-container">
          <h2 id="how-title" className="max-w-2xl title-section">
            {t("how.title")}
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {HOW.map((step, i) => (
              <li key={step.title} className="flex flex-col card p-6">
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{t(step.title)}</h3>
                <p className="mt-2 text-muted-foreground">{t(step.body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="features-title"
        className="page-container section-y"
      >
        <h2 id="features-title" className="max-w-2xl title-section">
          {t("feat.title")}
        </h2>
        <p className="mt-3 measure text-muted-foreground">{t("feat.help")}</p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ title, body, Icon, status, label }) => (
            <li key={title} className="flex h-full flex-col card p-6">
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground"
                >
                  <Icon className="size-5" />
                </span>
                <StatusBadge status={status}>{t(label)}</StatusBadge>
              </div>
              <h3 className="mt-4 text-lg font-bold">{t(title)}</h3>
              <p className="mt-2 text-muted-foreground">{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="trust-title"
        className="border-t border-border bg-muted section-y"
      >
        <div className="page-container grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <h2 id="trust-title" className="title-section">
              {t("trust.title")}
            </h2>
            <p className="mt-3 measure text-muted-foreground">
              {t("trust.help")}
            </p>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {TRUST.map((line) => (
              <li key={line} className="py-4 font-medium">
                {t(line)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="page-container section-y">
        <div className="flex flex-col items-start gap-5 card p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="cta-title" className="title-section">
              {t("cta.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">{t("cta.body")}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/signup">{t("auth.createProfile")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
