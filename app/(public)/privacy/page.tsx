import type { Metadata } from "next";
import { PublishedLegal } from "@/components/public/PublishedLegal";

// Shows the published version when one exists (mock for now); otherwise the placeholder until Beeliv supplies its approved Privacy Policy. Not indexed yet.
export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <PublishedLegal id="privacy" title="Privacy Policy" eyebrow="Privacy" />;
}
