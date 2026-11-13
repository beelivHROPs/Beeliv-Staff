import type { Metadata } from "next";
import { ProfileBody } from "@/components/staff/profile/ProfileBody";

export const metadata: Metadata = { title: "Profile" };

export default function StaffProfilePage() {
  return <ProfileBody />;
}
