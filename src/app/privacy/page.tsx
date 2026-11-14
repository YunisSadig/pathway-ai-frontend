import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/shared/prose-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy policy"
      updated="15 November 2026"
      intro="This describes how Pathway AI handles personal data today. It is an early-release service; the policy will be reviewed again before a public launch and we will say so here when it changes."
      sections={[
        {
          heading: "What we collect",
          body: (
            <ul>
              <li>
                <strong>Account:</strong> your email address, a name if you give
                one, and a salted hash of your password (never the password
                itself).
              </li>
              <li>
                <strong>Profile (all optional):</strong> country where you live,
                university, level and field of study, grades, language test
                scores, preferred degree, intake, destinations and tuition
                budget.
              </li>
              <li>
                <strong>Saved items:</strong> the programs and universities you
                choose to save.
              </li>
              <li>
                <strong>Security data:</strong> a session cookie while you are
                logged in, and counters of failed log-ins and sign-ups kept as
                hashes (not as readable email or IP addresses) to block abuse.
              </li>
            </ul>
          ),
        },
        {
          heading: "What we do not do",
          body: (
            <p>
              No advertising, no analytics or tracking scripts, no selling or
              sharing of your data, and no automated decision about you. Your
              profile is never turned into an admission score.
            </p>
          ),
        },
        {
          heading: "Cookies",
          body: (
            <p>
              One cookie, strictly necessary: it keeps you logged in. It is
              HttpOnly (scripts cannot read it) and is deleted when you log out.
              Nothing is stored in your browser&apos;s local storage to identify
              you.
            </p>
          ),
        },
        {
          heading: "Who processes it",
          body: (
            <p>
              The website runs on Vercel, the service on Render, and the
              database on Neon (in Frankfurt, Germany). They process data only
              to run the service. Their own logs may record technical request
              data such as IP addresses for a short time.
            </p>
          ),
        },
        {
          heading: "How long we keep it",
          body: (
            <p>
              Until you delete it. Deleting your account removes your profile,
              saved items and sessions at once.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              From <Link href="/settings">Settings</Link> you can download your
              data, clear your profile and delete your account without asking
              anyone. For anything else, use the{" "}
              <Link href="/contact">Contact</Link> page.
            </p>
          ),
        },
      ]}
    />
  );
}
