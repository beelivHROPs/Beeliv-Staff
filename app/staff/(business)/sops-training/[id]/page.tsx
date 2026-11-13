import type { Metadata } from "next";
import { SopDetailBody } from "@/components/staff/sops/SopDetailBody";

export const metadata: Metadata = { title: "SOPs & Training" };

export default async function StaffSopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SopDetailBody id={id} />;
}
