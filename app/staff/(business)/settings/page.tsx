import type { Metadata } from "next";
import { SettingsBody } from "@/components/staff/settings/SettingsBody";

export const metadata: Metadata = { title: "Settings" };

export default function StaffSettingsPage() {
  return <SettingsBody />;
}
