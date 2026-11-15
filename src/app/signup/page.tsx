import type { Metadata } from "next";
import { AuthShell } from "@/components/account/auth-shell";
import { SignupForm } from "@/components/account/signup-form";

export const metadata: Metadata = { title: "Create your profile" };

export default function SignupPage() {
  return (
    <AuthShell
      title="auth.signupTitle"
      description="auth.signupDescription"
      footer={{ text: "auth.haveAccount", link: "auth.login", href: "/login" }}
    >
      <SignupForm />
    </AuthShell>
  );
}
