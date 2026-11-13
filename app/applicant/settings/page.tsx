import type { Metadata } from "next";
import { SettingsBody } from "@/components/applicant/SettingsBody";

export const metadata: Metadata = { title: "Settings" };

export default function ApplicantSettingsPage() {
  return <SettingsBody />;
}
