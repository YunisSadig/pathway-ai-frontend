import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, TextLink } from "@/components/account/auth-shell";
import { VerifyEmailView } from "@/components/account/recovery-forms";

export const metadata: Metadata = { title: "Confirm your email" };

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Confirm your email"
      footer={<TextLink href="/login">Continue to log in</TextLink>}
    >
      <Suspense fallback={<div className="h-20" aria-hidden />}>
        <VerifyEmailView />
      </Suspense>
    </AuthShell>
  );
}
