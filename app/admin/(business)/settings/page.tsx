import type { Metadata } from "next";
import { SettingsBody } from "@/components/admin/settings/SettingsBody";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsBody />;
}
