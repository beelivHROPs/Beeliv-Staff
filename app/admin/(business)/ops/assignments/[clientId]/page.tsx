import type { Metadata } from "next";
import { AssignmentDetail } from "@/components/admin/ops/assign/AssignmentDetail";

export const metadata: Metadata = { title: "Client HR assignment" };

export default async function AssignmentDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <AssignmentDetail id={clientId} />;
}
