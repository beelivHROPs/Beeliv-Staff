import type { Metadata } from "next";
import { RequestsBody } from "@/components/client/requests/RequestsBody";

export const metadata: Metadata = { title: "Workforce Requests" };

export default async function Page({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: isNew } = await searchParams;
  return <RequestsBody key={isNew ?? ""} initialOpen={isNew === "1"} />;
}
