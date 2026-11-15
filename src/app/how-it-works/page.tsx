import type { Metadata } from "next";
import { HowItWorksContent } from "@/components/shared/how-it-works-content";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The five stages of Pathway AI and which of them exist today: your profile is available; the catalogue is a protected beta; scholarships, comparison and planning are not built yet.",
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
