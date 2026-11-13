import type { Metadata } from "next";
import { TemplateEditor } from "@/components/admin/journey/TemplateEditor";

export const metadata: Metadata = { title: "New job template" };

export default function Page() {
  return <TemplateEditor />;
}
