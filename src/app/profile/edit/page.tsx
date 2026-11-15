import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileEditPageClient } from "@/components/account/private-pages";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-container min-h-[60svh] section-y" aria-hidden />
      }
    >
      <ProfileEditPageClient />
    </Suspense>
  );
}
