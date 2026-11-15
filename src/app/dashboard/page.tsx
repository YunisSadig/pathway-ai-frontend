import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPageClient } from "@/components/account/private-pages";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-container min-h-[60svh] section-y" aria-hidden />
      }
    >
      <DashboardPageClient />
    </Suspense>
  );
}
