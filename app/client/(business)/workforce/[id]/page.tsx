import type { Metadata } from "next";
import { StaffDetailBody } from "@/components/client/workforce/StaffDetailBody";

export const metadata: Metadata = { title: "Staff member" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffDetailBody id={id} />;
}
