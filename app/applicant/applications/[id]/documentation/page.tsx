import type { Metadata } from "next";
import { DocumentationBody } from "@/components/applicant/documentation/DocumentationBody";

export const metadata: Metadata = { title: "Documentation" };

type Params = Promise<{ id: string }>;

/**
 * /applicant/applications/[id]/documentation — the applicant's Documentation
 * stage form (docs/BEELIV-APPLICANT-JOURNEY.md §4). Same params pattern as
 * ../page.tsx: application data lives in the client-side mock store, so the
 * lookup, the "not open yet" and the not-found states are resolved inside
 * the client component rather than here.
 */
export default async function ApplicantDocumentationPage({ params }: { params: Params }) {
  const { id } = await params;
  return <DocumentationBody key={id} applicationId={id} />;
}
