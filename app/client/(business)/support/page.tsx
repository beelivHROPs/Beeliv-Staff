import type { Metadata } from "next";
import { SupportBody } from "@/components/client/support/SupportBody";

export const metadata: Metadata = { title: "Support" };

export default async function ClientSupportPage({ searchParams }: PageProps<"/client/support">) {
  const { reason } = await searchParams;
  return <SupportBody initialReason={typeof reason === "string" ? reason : undefined} />;
}
