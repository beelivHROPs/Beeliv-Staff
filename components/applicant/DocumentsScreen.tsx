"use client";

import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DocumentCard } from "@/components/applicant/DocumentCard";
import { DocumentationWizard } from "@/components/applicant/documentation/DocumentationWizard";
import { SAMPLE_APPLICANT, SAMPLE_APPLICANT_DOCUMENTS } from "@/lib/placeholder-data";

type ViewMode = "form" | "status";

const VIEW_TABS: { value: ViewMode; label: string }[] = [
  { value: "form", label: "Documentation Form" },
  { value: "status", label: "Document Status" },
];

/**
 * Client half of the Documents screen — split out from page.tsx so the page
 * itself can stay a server component and keep exporting `metadata` (a
 * client component can't).
 *
 * Integration note: the multi-step Documentation intake wizard (docs/
 * BEELIV-APPLICANT-JOURNEY.md stage 4) is the actual functional gap this
 * screen was missing, and is now the default "Documentation Form" tab. The
 * earlier per-document status-card view (DocumentCard/SAMPLE_APPLICANT_
 * DOCUMENTS, built and approved first this session) is preserved unchanged
 * under a second "Document Status" tab rather than deleted or merged — it
 * answers a genuinely different question ("what's my upload status per
 * file, and is there a review/verification step") than the wizard ("let me
 * enter my information"), and recruitment-workflow.md §7 still doesn't
 * confirm whether a formal review/verification step exists to give that
 * status view long-term meaning, so keeping both screens clearly separated
 * is the safer call than silently folding one into the other. The Document
 * Status tab used to carry a dev-only toggle between three preview states
 * (Populated/Empty/Loading); stripped out since it was never meant to be
 * user-facing — the tab now just shows the one state consistent with the
 * shortlist gate below (matches DocumentsEmpty's own copy, which was always
 * describing the not-yet-shortlisted scenario). "Loading" is dropped
 * entirely — nothing in Stage 1 actually fetches over a network, so a real
 * user never sees a loading state here.
 *
 * Shortlist gate: the Documentation wizard (BEELIV-APPLICANT-JOURNEY.md
 * stage 4) is only reachable after Application Review/Shortlisting (2) and
 * Interview/Assessment (3) — see lib/placeholder-data.ts's SAMPLE_APPLICANT
 * comment. No real status backend exists yet (Stage 1), so this is enforced
 * against that same placeholder flag rather than real auth/data — purely
 * structural, matching how the rest of this Stage 1 build represents state
 * it can't yet enforce for real.
 */
export function DocumentsScreen() {
  const [view, setView] = useState<ViewMode>("form");

  return (
    <div>
      <div className="mb-5 flex gap-1.5 border-b border-border">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setView(tab.value)}
            className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
              view === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "form" ? (
        SAMPLE_APPLICANT.isShortlisted ? (
          <DocumentationWizard />
        ) : (
          <EmptyState
            variant="tray"
            title="Documentation opens once you're shortlisted"
            description="Your application is currently under review. Once you've been shortlisted and completed any required interview/assessment, this form will unlock so you can complete your onboarding documentation."
          />
        )
      ) : null}

      {view === "status" ? (
        SAMPLE_APPLICANT.isShortlisted ? <DocumentsPopulated /> : <DocumentsEmpty />
      ) : null}
    </div>
  );
}

function DocumentsPopulated() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_APPLICANT_DOCUMENTS.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3.5">
        <span className="rounded bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-warning uppercase">
          Note
        </span>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Whether a formal review/verification step exists at all — and who performs
          it — is not confirmed in <code>recruitment-workflow.md</code> §7.
          &quot;Pending Review&quot; and &quot;Approved&quot; are shown here as
          plausible states so the interface has somewhere to put them, not as
          confirmed functionality.
        </p>
      </div>
    </>
  );
}

function DocumentsEmpty() {
  return (
    <EmptyState
      variant="tray"
      title="No documents requested yet"
      description="Once your application moves into the documentation stage, any required documents will appear here for you to upload."
    />
  );
}
