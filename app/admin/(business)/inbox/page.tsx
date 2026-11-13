import type { Metadata } from "next";
import { InboxBody } from "@/components/admin/inbox/InboxBody";

export const metadata: Metadata = { title: "Inbox / Requests" };

export default function InboxPage() {
  return <InboxBody />;
}
