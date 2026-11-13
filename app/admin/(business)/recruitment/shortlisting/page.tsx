import type { Metadata } from "next";
import { ShortlistingList } from "@/components/admin/shortlisting/ShortlistingList";

export const metadata: Metadata = { title: "Shortlisting" };

export default function Page() {
  return <ShortlistingList />;
}
