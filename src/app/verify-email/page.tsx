import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { VerifyEmailView } from "@/components/account/recovery-forms";

export const metadata: Metadata = { title: "Confirm your email" };

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="auth.verifyTitle"
      footer={{ link: "auth.continueToLogin", href: "/login" }}
    >
      <Suspense fallback={<div className="h-20" aria-hidden />}>
        <VerifyEmailView />
      </Suspense>
    </AuthShell>
  );
}
