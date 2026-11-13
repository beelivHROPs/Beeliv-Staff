import type { Metadata } from "next";
import { FirstAdminSetup } from "@/components/admin/setup/FirstAdminSetup";
export const metadata: Metadata = { title: "First Admin setup", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <FirstAdminSetup />; }
