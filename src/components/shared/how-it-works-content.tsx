"use client";

import Link from "next/link";
import {
  Compass,
  GitCompareArrows,
  Library,
  Route,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { useT, type Key } from "@/lib/i18n";

/** The statuses are the truth today: the profile exists, the catalogue is a protected beta, the rest is not built. */
const STAGES: {
  title: Key;
  body: Key;
  status: Status;
  label: Key;
  Icon: LucideIcon;
}[] = [
  {
    title: "hiw.1.title",
    body: "hiw.1.body",
    status: "verified",
    label: "hiw.label.availableNow",
    Icon: UserRound,
  },
  {
    title: "hiw.2.title",
    body: "hiw.2.body",
    status: "hypothetical",
    label: "badge.beta",
    Icon: Compass,
  },
  {
    title: "hiw.3.title",
    body: "hiw.3.body",
    status: "unknown",
    label: "hiw.label.inPreparation",
    Icon: Library,
  },
  {
    title: "hiw.4.title",
    body: "hiw.4.body",
    status: "hypothetical",
    label: "hiw.label.planned",
    Icon: GitCompareArrows,
  },
  {
    title: "hiw.5.title",
    body: "hiw.5.body",
    status: "hypothetical",
    label: "hiw.label.planned",
    Icon: Route,
  },
];

export function HowItWorksContent() {
  const { t } = useT();
  return (
    <div className="page-container grid gap-10 section-y lg:grid-cols-[1fr_1.35fr] lg:gap-16">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">Pathway AI</p>
        <h1 className="mt-2 title-page">{t("hiw.title")}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          {t("hiw.intro")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/signup">{t("auth.createProfile")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/scholarships">{t("hiw.scholarships")}</Link>
          </Button>
        </div>
      </div>

      <ol className="grid gap-3">
        {STAGES.map(({ title, body, status, label, Icon }, i) => (
          <li
            key={title}
            className={`flex items-start gap-4 card p-4 sm:p-5 ${i === 0 ? "border-primary" : ""}`}
          >
            <span
              aria-hidden
              className={`grid size-11 shrink-0 place-items-center rounded-lg ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h2 className="text-lg font-bold">
                  <span aria-hidden className="text-muted-foreground">
                    {i + 1}.{" "}
                  </span>
                  <span className="sr-only">
                    {t("wizard.stepOf", { n: i + 1, total: STAGES.length })}
                    :{" "}
                  </span>
                  {t(title)}
                </h2>
                <StatusBadge status={status}>{t(label)}</StatusBadge>
              </div>
              <p className="mt-1 text-muted-foreground">{t(body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
