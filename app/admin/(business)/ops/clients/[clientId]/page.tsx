import type { Metadata } from "next";
import { ClientDetail } from "@/components/admin/ops/orgs/ClientDetail";

export const metadata: Metadata = { title: "Client" };

export default async function OpsClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <ClientDetail id={clientId} />;
}
