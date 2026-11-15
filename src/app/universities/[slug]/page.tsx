import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/shared/loading-state";
import { UniversityDetailEntry } from "@/components/universities/catalogue-entries";

export const metadata: Metadata = {
  title: "University details",
  description: "A university and the degree programs it offers.",
};

/**
 * Real ids are unknown at build time and are fetched in the browser. A placeholder lets Next.js prerender the page
 * shell (Cache Components needs one concrete param); every other value is rendered on demand.
 */
export function generateStaticParams() {
  return [{ slug: "example" }];
}

export default function UniversityPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container min-h-[100svh] section-y">
          <LoadingState label="Loading university" rows={3} />
        </div>
      }
    >
      <UniversityDetailEntry />
    </Suspense>
  );
}
