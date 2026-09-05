import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_SIZE_MB } from "@/lib/constraints";

/**
 * Status vocabulary ported from the approved Documents design artifact.
 * "Submitted" / "Required" are the only states with any documentation
 * backing (rbac.md §1: applicant uploads own documentation, sees
 * completion status). "Pending Review," "Approved," and "Requires
 * Attention" are shown as plausible states so the UI has somewhere to put
 * them — recruitment-workflow.md §7 does not confirm that a formal
 * review/verification step exists at all, or who would perform it. Do not
 * treat these three as confirmed functionality; see the note rendered at
 * the bottom of the Documents page.
 */
export type DocumentStatus =
  | "submitted"
  | "required"
  | "pending-review"
  | "approved"
  | "attention";

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; tone: "success" | "warning" | "info" | "danger" }
> = {
  submitted: { label: "Submitted", tone: "success" },
  required: { label: "Required", tone: "warning" },
  "pending-review": { label: "Pending Review", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  attention: { label: "Requires Attention", tone: "danger" },
};

// Icon-badge tint follows status, matching the approved artifact exactly:
// neutral for submitted/required/pending-review, success for approved,
// danger for attention — not an independently-set prop.
const ICON_TONE_CLASSES: Record<DocumentStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  required: "bg-muted text-muted-foreground",
  "pending-review": "bg-muted text-muted-foreground",
  approved: "bg-success/10 text-success",
  attention: "bg-destructive/10 text-destructive",
};

export interface DocumentEntry {
  id: string;
  title: string;
  description: string;
  status: DocumentStatus;
  /** e.g. "person" for a photograph vs the default file icon. Ignored when
   * status is "attention" — that state always shows the alert glyph, per
   * the artifact. */
  icon?: "file" | "person";
  /** Orange-caps provenance note, e.g. "REVIEW STEP: PROPOSED" — this
   * project's convention for flagging unconfirmed business rules inline. */
  provenanceNote?: string;
}

export function DocumentCard({ document }: { document: DocumentEntry }) {
  const { title, description, status, icon = "file", provenanceNote } = document;
  const config = STATUS_CONFIG[status];
  const isAttention = status === "attention";

  return (
    <Card
      className={isAttention ? "ring-destructive/35" : undefined}
    >
      <CardContent>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-md ${ICON_TONE_CLASSES[status]}`}
          >
            <DocumentGlyph shape={isAttention ? "alert" : icon} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-foreground">{title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StatusBadge label={config.label} tone={config.tone} />
              {provenanceNote ? (
                <span className="rounded bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-warning uppercase">
                  {provenanceNote}
                </span>
              ) : null}
              {status === "required" ? (
                <Button
                  size="sm"
                  disabled
                  title="Uploads aren't available yet"
                >
                  Upload
                </Button>
              ) : null}
              {isAttention ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled
                  title="Uploads aren't available yet"
                >
                  Retry
                </Button>
              ) : null}
            </div>
            {status === "required" || isAttention ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Max file size: {MAX_UPLOAD_SIZE_MB}MB
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentGlyph({ shape }: { shape: "file" | "person" | "alert" }) {
  if (shape === "person") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      </svg>
    );
  }
  if (shape === "alert") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
