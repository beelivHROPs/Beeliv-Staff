import type { Metadata } from "next";
import { GlanceBody } from "@/components/admin/glance/GlanceBody";

export const metadata: Metadata = { title: "Business at a glance" };

export default function Page() {
  return <GlanceBody />;
}
