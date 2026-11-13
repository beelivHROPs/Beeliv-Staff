import type { Metadata } from "next";
import { DocumentsBody } from "@/components/staff/documents/DocumentsBody";

export const metadata: Metadata = { title: "Documents" };

export default function StaffDocumentsPage() {
  return <DocumentsBody />;
}
