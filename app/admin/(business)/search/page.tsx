import type { Metadata } from "next";
import { AdminSearchPage } from "@/components/admin/search/AdminSearchPage";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  return <AdminSearchPage />;
}
