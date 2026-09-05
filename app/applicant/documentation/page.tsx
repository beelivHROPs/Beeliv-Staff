import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/PageHeading";
import { DocumentsScreen } from "@/components/applicant/DocumentsScreen";

export const metadata: Metadata = { title: "Documents" };

/**
 * Applicant Documents — now hosts the actual multi-step Documentation
 * intake wizard (recruitment workflow stage 4, docs/BEELIV-APPLICANT-
 * JOURNEY.md), the real data-entry form for personal information,
 * employment history, next-of-kin, sensitive/banking details, required
 * documents, and Terms & Declarations. Field set: docs/BEELIV-SOURCE-OF-
 * TRUTH.md §7. See components/applicant/documentation/DocumentationWizard
 * .tsx for the step-by-step build.
 *
 * The earlier per-document status-card view (DocumentCard/DocumentsScreen,
 * built first this session, approved) is preserved as a second "Document
 * Status" tab inside DocumentsScreen rather than replaced — see that
 * file's own integration-note comment. No real upload/storage/database
 * wiring exists yet — every field/control across both tabs is a disabled
 * placeholder, and no NIN/banking field *values* beyond obviously-fake
 * sample content are ever rendered outside the applicant's own intake form
 * (rbac.md §1/§8). The interactive tab/demo-state toggles live in
 * DocumentsScreen (a client component, kept separate so this page can stay
 * a server component and export `metadata`).
 */
export default function ApplicantDocumentationPage() {
  return (
    <div>
      <PageHeading
        title="Documents"
        description="Complete your onboarding documentation, or review your document status."
      />
      <DocumentsScreen />
    </div>
  );
}
