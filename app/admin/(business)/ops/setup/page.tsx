import type { Metadata } from "next";
import { SetupCenter } from "@/components/admin/ops/setup/SetupCenter";

export const metadata: Metadata = { title: "Setup" };

export default function SetupPage() {
  return <SetupCenter />;
}
