import type { Metadata } from "next";
import { HelpBody } from "@/components/staff/help/HelpBody";

export const metadata: Metadata = { title: "Help & support" };

export default function StaffHelpPage() {
  return <HelpBody />;
}
