import type { Metadata } from "next";
import { AuthShell } from "@/components/account/auth-shell";
import { LinkGoogleForm } from "@/components/account/link-google-form";

export const metadata: Metadata = {
  title: "Connect Google",
  robots: { index: false },
};

export default function LinkGooglePage() {
  return (
    <AuthShell
      title="auth.link.title"
      description="auth.link.description"
      footer={{ text: "auth.newHere", link: "auth.login", href: "/login" }}
    >
      <LinkGoogleForm />
    </AuthShell>
  );
}
