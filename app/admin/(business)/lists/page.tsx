import type { Metadata } from "next";
import { ListsBody } from "@/components/admin/lists/ListsBody";

export const metadata: Metadata = { title: "Lists & Rules" };

export default function Page() {
  return <ListsBody />;
}
