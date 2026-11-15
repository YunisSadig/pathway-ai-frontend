import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, TextLink } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Log in to see your dashboard, profile and saved programs."
      footer={
        <>
          New to Pathway AI?{" "}
          <TextLink href="/signup">Create your profile</TextLink>
        </>
      }
    >
      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
