import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="auth.loginTitle"
      description="auth.loginDescription"
      footer={{
        text: "auth.newHere",
        link: "auth.createProfile",
        href: "/signup",
      }}
    >
      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
