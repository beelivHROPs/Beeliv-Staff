import type { Metadata } from "next";
import { StaffSearchPage } from "@/components/staff/search/StaffSearchPage";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  return <StaffSearchPage />;
}
