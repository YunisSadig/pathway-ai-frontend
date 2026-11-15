import type { Metadata } from "next";
import { PageIntro } from "@/components/shared/page-intro";
import { UniversitiesEntry } from "@/components/universities/catalogue-entries";

export const metadata: Metadata = {
  title: "Universities",
  description:
    "Discover degree programs by destination, discipline, level, language and tuition, then see the universities that offer them.",
};

export default function UniversitiesPage() {
  return (
    <div className="page-container section-y">
      <PageIntro title="Universities">
        Explore the universities Pathway AI tracks, with their official
        websites. Program details are shown to signed-in beta accounts, each
        with its official source and the date it was read.
      </PageIntro>

      <div className="mt-8">
        <UniversitiesEntry />
      </div>
    </div>
  );
}
