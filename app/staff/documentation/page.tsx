import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/PageHeading";
import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DocumentCard } from "@/components/applicant/DocumentCard";
import { SAMPLE_STAFF_DOCUMENTS } from "@/lib/placeholder-data";

export const metadata: Metadata = { title: "My Documentation" };

/**
 * Reuses DocumentCard (components/applicant/DocumentCard.tsx) for the
 * incomplete case — it's presentation-only (Card/StatusBadge/Button, no
 * applicant-specific text baked in), so showing this staff member's own
 * documents through it avoids duplicating the icon/status-badge/action
 * logic a second time. Previously this page was hardcoded to always show
 * "Complete" regardless of actual status; now it's derived from
 * SAMPLE_STAFF_DOCUMENTS, the same list app/staff/dashboard's
 * "documentationComplete" is derived from.
 */
export default function StaffDocumentationPage() {
  const documents = SAMPLE_STAFF_DOCUMENTS;
  const isComplete = documents.every(
    (doc) => doc.status === "submitted" || doc.status === "approved"
  );

  return (
    <div>
      <PageHeading title="My Documentation" />
      {isComplete ? (
        <Card title="Onboarding Documentation">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">All required items</span>
            <StatusBadge label="Complete" tone="success" />
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}
