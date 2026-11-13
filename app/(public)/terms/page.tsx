import type { Metadata } from "next";
import { PublishedLegal } from "@/components/public/PublishedLegal";

// Shows the published version when one exists (mock for now); otherwise the placeholder until Beeliv supplies its approved Terms and Conditions. Not indexed yet.
export const metadata: Metadata = {
  title: "Terms and Conditions",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <PublishedLegal id="terms" title="Terms and Conditions" eyebrow="Terms" />;
}
