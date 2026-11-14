import type { Metadata } from "next";
import { AuthShell, TextLink } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/recovery-forms";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email address and we will send you a link to choose a new one."
      footer={<TextLink href="/login">Back to log in</TextLink>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
