import type { Metadata } from "next";
import { TemplateEditor } from "@/components/admin/journey/TemplateEditor";

export const metadata: Metadata = { title: "Edit job template" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateEditor templateId={id} />;
}
