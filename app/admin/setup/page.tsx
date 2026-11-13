import type { Metadata } from "next";
import { SetupBody } from "@/components/admin/setup/SetupBody";
import { authMode } from "@/lib/auth/mode";

export const metadata: Metadata = { title: "Account setup", robots: { index: false, follow: false } };

export default function AdminSetupPage() {
  return <SetupBody mode={authMode()} />;
}
