import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/shared/prose-page";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <ProsePage
      title="Contact"
      intro="Pathway AI is a small project in early release. This is how to reach us."
      sections={[
        {
          heading: "Questions, problems and corrections",
          body: (
            <p>
              Open an issue on our{" "}
              <a
                href="https://github.com/YunisSadig/pathway-ai-frontend/issues"
                rel="noopener noreferrer"
              >
                public issue tracker
              </a>
              . Please do not post personal data there. A monitored contact
              address will be published here before the public launch.
            </p>
          ),
        },
        {
          heading: "Your data",
          body: (
            <p>
              You do not need to contact anyone to see, export or delete your
              data: it is all in <Link href="/settings">Settings</Link>.
            </p>
          ),
        },
        {
          heading: "Information about a university or program",
          body: (
            <p>
              Every fact links to its official source. If something looks wrong,
              check that source first, then tell us what you found.
            </p>
          ),
        },
      ]}
    />
  );
}
