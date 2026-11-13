"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { intakeFile } from "@/components/shared/documents/intake";
import { staffFileKey } from "@/lib/demo-files/keys";
import { staffMode } from "@/lib/staff/mode";
import { fileProblem } from "./file-rules";
import { useStaffDocuments, useStaffProfile } from "@/lib/staff/hooks";
import { replaceStaffDocument, uploadStaffDocument } from "@/lib/staff/service";
import type { StaffDocument } from "@/lib/staff/types";
import { ClipboardList as ClipboardCheck } from "../icons";
import { ActionPill, Disc, PASTEL } from "../kit";
import { DocumentsPhone, DocumentsPhoneSkeleton } from "./DocumentsPhone";

/** Route-level and in-page loading: one skeleton for every width (the same layout is used everywhere). */
export function DocumentsSkeleton() {
  return <DocumentsPhoneSkeleton />;
}

/**
 * Staff Document Centre. What Beeliv is waiting for first (one upload action each), then what
 * is on file in one list. Rows show name, status, file name (never file contents or sensitive
 * values) and one contextual action. Who may see which document is a backend/RLS decision.
 * One layout at every width; desktop centres it in a readable column.
 */
export function DocumentsBody() {
  const { data, status, retry } = useStaffDocuments();
  const [busyId, setBusyId] = useState<string | null>(null);
  const profile = useStaffProfile().data;
  const ownerName = profile ? `${profile.preferredName ?? profile.firstName} ${profile.lastName}` : "";

  if (status === "loading") return <DocumentsSkeleton />;

  async function send(doc: StaffDocument, file: File) {
    // Demo: the real file is kept in this browser so it can be previewed; otherwise only the usual checks run.
    const problem = fileProblem(file);
    if (problem) { toast.add({ title: problem, type: "error" }); return; }
    if (staffMode() === "mock" && (await intakeFile(file, staffFileKey(doc.id), ownerName, doc.name)) === false) return;
    setBusyId(doc.id);
    try {
      // Replace when a file already exists, otherwise a first upload.
      await ((doc.hasCurrentFile ?? Boolean(doc.fileName)) ? replaceStaffDocument(doc.id, file) : uploadStaffDocument(doc.id, file));
      toast.add({ title: "Document uploaded", description: "Check its status below. Uploading does not mean it has been approved.", type: "success" });
    } catch {
      toast.add({ title: "We couldn't confirm the upload", description: "Refresh your documents to check its status before trying again.", type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const onboarding = profile?.accountStatus === "onboarding";
  return (
    <>
      {onboarding ? (
        <aside aria-label="Onboarding" className={`mx-auto mb-5 flex w-full max-w-[1120px] flex-col gap-3.5 rounded-[22px] p-4 min-[640px]:flex-row min-[640px]:items-center ${PASTEL.lavender}`}>
          {/* Icon + text stay together as one row; on phones the button drops to its own full-width row so the text never gets squeezed into a narrow column. */}
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <Disc icon={ClipboardCheck} size={48} />
            <p className="min-w-0 flex-1 leading-snug">
              <b className="block text-[16px] text-(--ap-ink)">Part of your onboarding</b>
              <span className="text-[14px] text-(--ap-ink-2)">Upload requested documents here, then check their review status.</span>
            </p>
          </div>
          <ActionPill href="/staff" variant="outline" compact arrow={false} className="w-full justify-center min-[640px]:w-auto">
            Back to onboarding
          </ActionPill>
        </aside>
      ) : null}
      <DocumentsPhone docs={data ?? []} status={status} retry={retry} ownerName={ownerName} busyId={busyId} onFile={send} />
    </>
  );
}
