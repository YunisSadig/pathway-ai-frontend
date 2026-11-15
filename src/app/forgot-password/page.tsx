import type { Metadata } from "next";
import { AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/recovery-forms";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="auth.forgotTitle"
      description="auth.forgotDescription"
      footer={{ link: "auth.backToLogin", href: "/login" }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
