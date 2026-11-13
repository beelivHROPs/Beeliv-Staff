"use client";

/**
 * View + Download for one document in the Client app (decision 1, 2026-10-18).
 * Opens the shared DocumentPreview (no print control; PDF/JPG/PNG). Sensitive types
 * (NIN, bank, ID image, medical) show NO controls, only "Held securely by Beeliv".
 * Files come from the demo file store / sample fallback until the signed-link flow exists;
 * when that store is off (real backend not wired) no controls are shown, only the status.
 */
import { useState } from "react";
import { Download, Eye, LockKeyhole } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { DocumentPreviewDialog } from "@/components/shared/documents/DocumentPreview";
import { useDemoFilesEnabled } from "@/lib/demo-files/hooks";
import { downloadDemoFile } from "@/lib/demo-files/store";
import { clientFileKey, isSensitiveForClient } from "@/lib/client/document-access";

// Quiet text actions: a View + Download pair repeats on every document row, so it must not be a filled or outlined button each time.
const BTN = "ap-btn ap-btn-q ap-btn-sm";

export function ClientDocumentActions({ ownerId, ownerName, documentType, className = "" }: { ownerId: string; ownerName: string; documentType: string; className?: string }) {
  const enabled = useDemoFilesEnabled();
  const [open, setOpen] = useState(false);

  if (isSensitiveForClient(documentType)) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[13px] text-(--ap-muted) ${className}`}>
        <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" /> Held securely by Beeliv
      </span>
    );
  }
  if (!enabled) return null;
  const key = clientFileKey(ownerId, documentType);
  return (
    <span className={`-ml-2 inline-flex items-center gap-1 ${className}`}>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`View ${documentType}, ${ownerName}`} className={BTN}>
        <Eye className="size-4" aria-hidden="true" /> View
      </button>
      <button
        type="button"
        aria-label={`Download ${documentType}, ${ownerName}`}
        className={BTN}
        onClick={() => {
          void downloadDemoFile(key).then((ok) => {
            if (!ok) toast.add({ title: "We couldn't download that", description: "Please try again in a moment.", type: "error" });
          });
        }}
      >
        <Download className="size-4" aria-hidden="true" /> Download
      </button>
      {open ? <DocumentPreviewDialog fileKey={key} title={`${documentType}, ${ownerName}`} ownerName={ownerName} label={documentType} onClose={() => setOpen(false)} /> : null}
    </span>
  );
}
