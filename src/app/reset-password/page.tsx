import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, TextLink } from "@/components/account/auth-shell";
import { ResetPasswordForm } from "@/components/account/recovery-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      footer={<TextLink href="/login">Back to log in</TextLink>}
    >
      <Suspense fallback={<div className="h-40" aria-hidden />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
