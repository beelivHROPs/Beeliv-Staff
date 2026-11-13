import type { Metadata } from "next";
import { DocumentsBody } from "@/components/applicant/DocumentsBody";

export const metadata: Metadata = { title: "Documents" };

export default function ApplicantDocumentsPage() {
  return <DocumentsBody />;
}
