import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SITE } from "@/lib/site";

const STEPS = [
  {
    title: "Create your profile",
    body: "Your grades, language tests, budget and preferred destinations.",
    badge: { status: "verified", label: "Available" },
  },
  {
    title: "Discover programs",
    body: "Official information with its source, for programs that fit you.",
    badge: { status: "hypothetical", label: "Protected beta" },
  },
  {
    title: "Save and compare",
    body: "Keep a shortlist and weigh requirements and costs side by side.",
    badge: { status: "neutral", label: "Coming soon" },
  },
] as const;

/** Server component: no client JavaScript and no animation library. */
export function Hero() {
  return (
    <section className="page-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-24">
      <div>
        <p className="eyebrow">Study-abroad guide · Early release</p>
        <h1 className="mt-4 title-hero">{SITE.tagline}</h1>
        <p className="mt-5 measure text-lg text-muted-foreground sm:text-xl">
          Pathway AI helps international students understand programs,
          requirements and costs from official sources before they apply. Create
          a free profile to get started; the university catalogue is opening
          step by step.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">Create your profile</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/how-it-works">Explore the platform</Link>
          </Button>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {[
            "Free to use",
            "No payment details",
            "Delete your data any time",
          ].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="size-4 text-success" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5 sm:p-6" aria-labelledby="pathway-title">
        <h2 id="pathway-title" className="text-lg font-bold">
          Your pathway
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What you can do today, and what is on the way.
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
                  <p className="font-semibold">{step.title}</p>
                  <StatusBadge status={step.badge.status}>
                    {step.badge.label}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
