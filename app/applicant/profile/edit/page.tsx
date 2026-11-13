import type { Metadata } from "next";
import { ProfileEditBody } from "@/components/applicant/ProfileEditBody";

export const metadata: Metadata = { title: "About you" };

export default function ApplicantProfileEditPage() {
  return <ProfileEditBody />;
}
