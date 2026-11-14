import Link from "next/link";
import { Award, Bookmark, GraduationCap, Target } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";

const HOW = [
  {
    title: "Tell us about you",
    body: "Add the qualifications, language scores, budget and destinations you care about. Everything is optional and you can change it any time.",
  },
  {
    title: "See official information",
    body: "Programs show their requirements, deadlines and fees as the university publishes them, each linked to its official source.",
  },
  {
    title: "Decide with confidence",
    body: "Pathway AI never invents an admission chance. When a fact is unknown it says so, instead of guessing.",
  },
];

const FEATURES: {
  title: string;
  body: string;
  Icon: typeof GraduationCap;
  status: Status;
  label: string;
}[] = [
  {
    title: "University discovery",
    body: "Filter degree programs by destination, level, discipline and language, with the official source for every fact.",
    Icon: GraduationCap,
    status: "hypothetical",
    label: "Protected beta",
  },
  {
    title: "Saved programs",
    body: "Keep a shortlist of programs and universities in your account.",
    Icon: Bookmark,
    status: "hypothetical",
    label: "Protected beta",
  },
  {
    title: "Scholarships",
    body: "Verified funding opportunities from official sources. Nothing is listed yet.",
    Icon: Award,
    status: "neutral",
    label: "Coming soon",
  },
  {
    title: "Personalized matching",
    body: "Comparing your profile with verified requirements, showing what you meet, what you miss and what is unknown.",
    Icon: Target,
    status: "neutral",
    label: "Coming soon",
  },
];

const TRUST = [
  "Every changing fact shows its source and when it was read.",
  "Unknown stays unknown: no placeholders, no invented numbers.",
  "No admission probabilities, ever, unless a university publishes one.",
  "Your profile is yours: export it or delete it from Settings.",
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <section
        aria-labelledby="how-title"
        className="border-y border-border bg-muted section-y"
      >
        <div className="page-container">
          <h2 id="how-title" className="max-w-2xl title-section">
            How Pathway AI works
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
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.body}</p>
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
          What is here, and what is next
        </h2>
        <p className="mt-3 measure text-muted-foreground">
          We only list what works today. The rest is labelled, so you always
          know where Pathway AI stands.
        </p>
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
                <StatusBadge status={status}>{label}</StatusBadge>
              </div>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{body}</p>
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
              Built to be trusted
            </h2>
            <p className="mt-3 measure text-muted-foreground">
              Choosing where to study is a big decision. Pathway AI is designed
              around honest information.
            </p>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {TRUST.map((line) => (
              <li key={line} className="py-4 font-medium">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="page-container section-y">
        <div className="flex flex-col items-start gap-5 card p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="cta-title" className="title-section">
              Ready to start?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Create your profile in a minute. It is free, and you stay in
              control of your data.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/signup">Create your profile</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
