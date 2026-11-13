import type { Metadata } from "next";
import { FormTakeBody } from "@/components/staff/forms/FormsBody";

export const metadata: Metadata = { title: "Form" };

export default async function StaffFormTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormTakeBody id={id} />;
}
