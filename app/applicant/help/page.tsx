import type { Metadata } from "next";
import { HelpBody } from "@/components/applicant/HelpBody";

export const metadata: Metadata = { title: "Help & support" };

export default function ApplicantHelpPage() {
  return <HelpBody />;
}
