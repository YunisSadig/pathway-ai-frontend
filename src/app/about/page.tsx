import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/shared/prose-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage
      title="About Pathway AI"
      intro="Pathway AI is a study-abroad guide for international students. It is in early release, and this page says plainly what works and what does not."
      sections={[
        {
          heading: "What we are building",
          body: (
            <p>
              A place where you can describe your studies and plans, and see
              degree programs, requirements and costs exactly as universities
              publish them, each linked to its official source. The goal is to
              help you understand your options before you apply.
            </p>
          ),
        },
        {
          heading: "Where the information comes from",
          body: (
            <>
              <p>
                Facts are read from official sources, such as national education
                registers and university pages, by programs that check them
                again on a schedule. Every changing fact shows its source and
                the date it was read. When a source does not state something,
                Pathway AI says &quot;not stated&quot; instead of guessing.
              </p>
              <p>
                We never invent admission probabilities or scores. If a
                university does not publish a chance, we do not create one.
              </p>
            </>
          ),
        },
        {
          heading: "What works today",
          body: (
            <ul>
              <li>
                Creating an account and keeping a private profile of your
                studies and plans.
              </li>
              <li>
                The university catalogue is in a <strong>protected beta</strong>
                : it is open only to invited accounts while we confirm the terms
                for reusing the official data.
              </li>
              <li>
                Scholarships and personalized matching are not built yet and are
                labelled as coming soon.
              </li>
            </ul>
          ),
        },
        {
          heading: "Your data",
          body: (
            <p>
              You control it. You can download everything we hold about you,
              clear your profile, or delete your account from{" "}
              <Link href="/settings">Settings</Link>. See the{" "}
              <Link href="/privacy">Privacy policy</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
