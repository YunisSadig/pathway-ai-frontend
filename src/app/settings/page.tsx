import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPageClient } from "@/components/account/private-pages";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-container min-h-[60svh] section-y" aria-hidden />
      }
    >
      <SettingsPageClient />
    </Suspense>
  );
}
