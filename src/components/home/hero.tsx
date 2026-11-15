"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useT, type Key } from "@/lib/i18n";

const STEPS: {
  title: Key;
  body: Key;
  tone: "verified" | "hypothetical" | "neutral";
  badge: Key;
}[] = [
  {
    title: "home.step1.title",
    body: "home.step1.body",
    tone: "verified",
    badge: "badge.available",
  },
  {
    title: "home.step2.title",
    body: "home.step2.body",
    tone: "hypothetical",
    badge: "badge.beta",
  },
  {
    title: "home.step3.title",
    body: "home.step3.body",
    tone: "neutral",
    badge: "badge.soon",
  },
];

const REASSURANCE: Key[] = [
  "home.free",
  "home.noPayment",
  "home.deleteAnytime",
];

export function Hero() {
  const { t } = useT();
  return (
    <section className="page-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-24">
      <div>
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1 className="mt-4 title-hero">{t("home.tagline")}</h1>
        <p className="mt-5 measure text-lg text-muted-foreground sm:text-xl">
          {t("home.lead")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">{t("auth.createProfile")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/universities">{t("home.exploreUniversities")}</Link>
          </Button>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {REASSURANCE.map((key) => (
            <li key={key} className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="size-4 text-success" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5 sm:p-6" aria-labelledby="pathway-title">
        <h2 id="pathway-title" className="text-lg font-bold">
          {t("home.pathway")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("home.pathwayHelp")}
        </p>
        <ol className="mt-4 divide-y divide-border border-y border-border">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4 py-4">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary-soft-foreground"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="font-semibold">{t(step.title)}</p>
                  <StatusBadge status={step.tone}>{t(step.badge)}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(step.body)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
