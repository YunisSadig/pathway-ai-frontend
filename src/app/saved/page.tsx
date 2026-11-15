import type { Metadata } from "next";
import { Suspense } from "react";
import { SavedPageClient } from "@/components/account/private-pages";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-container min-h-[60svh] section-y" aria-hidden />
      }
    >
      <SavedPageClient />
    </Suspense>
  );
}
