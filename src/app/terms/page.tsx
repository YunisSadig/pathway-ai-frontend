import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/shared/prose-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of use"
      updated="15 November 2026"
      intro="Plain terms for an early-release service. They will be reviewed again before a public launch."
      sections={[
        {
          heading: "The service",
          body: (
            <p>
              Pathway AI provides information to help you explore studying
              abroad. It is provided as it is, may be incomplete, and may change
              or pause while it is in early release.
            </p>
          ),
        },
        {
          heading: "Information is not advice",
          body: (
            <p>
              Fees, deadlines and requirements come from official sources and
              can change. Always confirm them on the official university website
              before you decide or apply. Pathway AI does not promise admission,
              funding or any outcome.
            </p>
          ),
        },
        {
          heading: "Your account",
          body: (
            <ul>
              <li>
                Give accurate information and keep your password to yourself.
              </li>
              <li>
                Do not try to break, overload or bypass the service, or access
                other people&apos;s data.
              </li>
              <li>
                You can delete your account at any time in{" "}
                <Link href="/settings">Settings</Link>.
              </li>
            </ul>
          ),
        },
        {
          heading: "The data we show",
          body: (
            <p>
              University and program information belongs to its publishers and
              is shown with its source. Parts of the catalogue are in a
              protected beta and are available only to invited accounts.
            </p>
          ),
        },
        {
          heading: "Changes",
          body: (
            <p>
              We may update these terms; the date above shows the latest
              version. Questions: see <Link href="/contact">Contact</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
