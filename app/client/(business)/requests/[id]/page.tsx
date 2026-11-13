import type { Metadata } from "next";
import { RequestDetailBody } from "@/components/client/requests/RequestDetailBody";

export const metadata: Metadata = { title: "Workforce request" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetailBody id={id} />;
}
