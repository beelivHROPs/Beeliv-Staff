import type { Metadata } from "next";
import { ProfileBody } from "@/components/applicant/ProfileBody";

export const metadata: Metadata = { title: "Profile" };

export default function ApplicantProfilePage() {
  return <ProfileBody />;
}
