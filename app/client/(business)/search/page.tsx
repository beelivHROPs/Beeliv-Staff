import type { Metadata } from "next";
import { ClientSearchPage } from "@/components/client/search/ClientSearchPage";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  return <ClientSearchPage />;
}
