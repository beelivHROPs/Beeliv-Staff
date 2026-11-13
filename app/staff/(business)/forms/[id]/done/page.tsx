import type { Metadata } from "next";
import { FormDoneBody } from "@/components/staff/forms/FormsBody";

export const metadata: Metadata = { title: "Form sent" };

export default async function StaffFormDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormDoneBody id={id} />;
}
