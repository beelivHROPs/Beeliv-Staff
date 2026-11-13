import type { Metadata } from "next";
import { InboxBody } from "@/components/admin/inbox/InboxBody";

export const metadata: Metadata = { title: "Case" };

/** Phones open a case full-screen here; wide screens show the same three-pane inbox with this case selected. */
export default async function InboxCasePage({ params }: PageProps<"/admin/inbox/[id]">) {
  const { id } = await params;
  return <InboxBody caseId={id} />;
}
