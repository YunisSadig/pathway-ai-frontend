import type { Metadata } from "next";
import { AuthShell, TextLink } from "@/components/account/auth-shell";
import { SignupForm } from "@/components/account/signup-form";

export const metadata: Metadata = { title: "Create your profile" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your profile"
      description="A free account to keep your study plans, preferences and saved programs in one place."
      footer={
        <>
          Already have an account? <TextLink href="/login">Log in</TextLink>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
