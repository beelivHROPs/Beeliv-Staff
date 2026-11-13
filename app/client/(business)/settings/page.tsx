import type { Metadata } from "next";
import { SettingsBody } from "@/components/client/SettingsBody";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsBody />;
}
