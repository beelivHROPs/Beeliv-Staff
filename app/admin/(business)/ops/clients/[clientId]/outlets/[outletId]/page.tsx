import type { Metadata } from "next";
import { OutletDetail } from "@/components/admin/ops/orgs/OutletDetail";

export const metadata: Metadata = { title: "Outlet" };

export default async function OpsOutletPage({ params }: { params: Promise<{ clientId: string; outletId: string }> }) {
  const { clientId, outletId } = await params;
  return <OutletDetail clientId={clientId} outletId={outletId} />;
}
