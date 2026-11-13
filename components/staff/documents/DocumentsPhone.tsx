"use client";

/**
 * Documents on phones (below 768px). What Beeliv is waiting for comes first, one soft card per
 * document with the single upload action; everything already on file follows as quiet cards with
 * a status word. Only file names and statuses are shown, never file contents or sensitive values.
 * Who may see which document is a backend/RLS decision.
 */
import { useRef, useState } from "react";
import { CircleAlert, Download, Eye, FileText, Files, Upload } from "@/components/applicant/icons";
import { DocumentPreviewDialog } from "@/components/shared/documents/DocumentPreview";
import { staffFileKey } from "@/lib/demo-files/keys";
import { useDemoFileMeta } from "@/lib/demo-files/hooks";
import { downloadDemoFile } from "@/lib/demo-files/store";
import { dueLabel, timeAgo } from "@/lib/staff/format";
import type { DocumentGroup, DocumentStatus, StaffDocument } from "@/lib/staff/types";
import { CircleCheck } from "../icons";
import { ActionPill, Disc, LIFT, PANEL, PASTEL, Sk, StateCard, confirmAction } from "../kit";
import { ACCEPT, FORMATS } from "./file-rules";
import { staffMode } from "@/lib/staff/mode";

const GROUP_LABEL: Record<DocumentGroup, string> = {
  identity: "Personal / Identity",
  employment: "Employment",
  payroll: "Payroll / Banking",
  certificates: "Certificates",
  agreements: "Agreements & Consents",
  other: "Requested by Beeliv",
};

const WORD: Record<DocumentStatus, { word: string; dot: string }> = {
  required: { word: "Needed", dot: "bg-(--ap-warn)" },
  uploaded: { word: "Uploaded", dot: "bg-(--ap-violet)" },
  "under-review": { word: "Under review", dot: "bg-(--ap-violet)" },
  verified: { word: "Verified", dot: "bg-(--ap-ok)" },
  "update-required": { word: "Update needed", dot: "bg-(--ap-warn)" },
  expired: { word: "Expired", dot: "bg-(--ap-rose)" },
};

export const needsAction = (d: StaffDocument) => d.status === "required" || d.status === "update-required" || d.status === "expired";

export function DocumentsPhoneSkeleton() {
  return (
    <div className="flex w-full flex-col gap-5 pt-2" aria-busy="true" aria-label="Loading your documents">
      <h1 className="sr-only">Documents</h1>
      <Sk className="h-[170px]" />
      <Sk className="h-6 w-32" />
      <Sk className="h-[150px]" />
      <Sk className="h-[150px]" />
    </div>
  );
}

function PhoneDoc({ doc, ownerName, busy, disabled, onFile, flat = false }: { doc: StaffDocument; ownerName: string; busy: boolean; disabled: boolean; onFile: (f: File) => void; flat?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const fileKey = staffFileKey(doc.id);
  const stored = useDemoFileMeta(staffMode() === "mock" ? fileKey : null);
  const meta = stored?.sample && !doc.fileName ? null : stored;
  const [viewing, setViewing] = useState(false);
  const urgent = needsAction(doc);
  const label = doc.status === "required" ? "Upload" : doc.requestNote && urgent ? "Respond to request" : urgent ? "Upload new" : "Replace";
  const w = WORD[doc.status];
  const detail = doc.fileName ? `${doc.fileName}${doc.updatedAt ? ` · updated ${timeAgo(doc.updatedAt)}` : ""}` : GROUP_LABEL[doc.group];
  const round = "flex size-12 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";
  /** Replacing a file Beeliv already has: one calm check. The picker opens from the confirm click itself. */
  function askReplace() {
    return confirmAction({
      tone: "caution",
      title: `Replace ${doc.name}?`,
      description: "Upload a new version. Beeliv will check it before accepting the replacement.",
      confirmLabel: "Choose a new file",
      cancelLabel: "Keep current file",
      onConfirm: () => input.current?.click(),
    });
  }
  return (
    <li className={flat ? "border-t border-(--ap-line-2) p-4 first:border-t-0 min-[1000px]:[&:nth-child(2)]:border-t-0 min-[1000px]:even:border-l" : `rounded-[22px] p-4 ${urgent ? PASTEL.sand : "bg-(--ap-surface,#fff)"} ${LIFT}`}>
      <div className="flex items-start gap-3.5">
        <Disc icon={(doc.hasCurrentFile ?? Boolean(doc.fileName)) ? FileText : Upload} size={48} className={urgent ? "" : "bg-(--ap-tint) text-(--ap-violet) shadow-none"} />
        <div className="min-w-0 flex-1 leading-snug">
          {urgent ? <p className="text-[14px] font-semibold text-(--ap-warn)">{w.word}{doc.dueDate ? ` · ${dueLabel(doc.dueDate)}` : ""}</p> : null}
          <b className="block text-[17px] text-(--ap-ink)">{doc.name}</b>
          <span className="block truncate text-[14px] text-(--ap-ink-2)">{detail}</span>
          {urgent ? null : (
            <span className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-(--ap-ink-2)">
              <span className={`size-2 rounded-full ${w.dot}`} aria-hidden="true" />
              {w.word}
            </span>
          )}
        </div>
      </div>
      {doc.requestNote && urgent ? <p className="mt-3 rounded-2xl bg-(--ap-tint-soft) px-3.5 py-2.5 text-[15px] text-(--ap-ink-2)">{doc.requestNote}</p> : null}
      <div className="mt-3.5 flex items-center gap-2.5">
        <ActionPill icon={Upload} variant={urgent ? "purple" : "outline"} compact arrow={false} loading={busy} disabled={disabled || doc.uploadPending} onClick={() => ((doc.hasCurrentFile ?? Boolean(doc.fileName)) && !urgent ? void askReplace() : input.current?.click())} ariaLabel={`${label}: ${doc.name}`} className="min-w-0 flex-1 min-[768px]:flex-none">
          {busy ? "Uploading..." : label}
        </ActionPill>
        {meta ? (
          <>
            <button type="button" onClick={() => setViewing(true)} aria-label={`View ${doc.name}`} className={round}>
              <Eye className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => void downloadDemoFile(fileKey)} aria-label={`Download ${doc.name}`} className={round}>
              <Download className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {viewing && meta ? <DocumentPreviewDialog fileKey={fileKey} title={doc.name} ownerName={ownerName} label={doc.name} onClose={() => setViewing(false)} /> : null}
    </li>
  );
}

export function DocumentsPhone({ docs, status, retry, ownerName, busyId, onFile }: { docs: StaffDocument[]; status: string; retry: () => void; ownerName: string; busyId: string | null; onFile: (d: StaffDocument, f: File) => void }) {
  if (status === "error") {
    return (
      <div className="pt-2">
        <StateCard
          icon={CircleAlert}
          title="We couldn't load your documents"
          text="Check your connection and try again. Nothing on your account has changed."
          action={
            <ActionPill variant="purple" compact className="w-full" onClick={retry}>
              Try again
            </ActionPill>
          }
        />
      </div>
    );
  }
  if (docs.length === 0) {
    return (
      <div className="pt-2">
        <StateCard glass="documents" icon={Files} title="No documents yet" text="When Beeliv asks for a document, or you have one on file, it appears here." />
      </div>
    );
  }
  const todo = docs.filter(needsAction);
  const done = docs.filter((d) => !needsAction(d));
  const item = (d: StaffDocument, flat = false) => <PhoneDoc key={d.id} doc={d} ownerName={ownerName} busy={busyId === d.id} disabled={busyId !== null} onFile={(f) => onFile(d, f)} flat={flat} />;
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2 min-[1000px]:grid min-[1000px]:grid-cols-2 min-[1000px]:items-start min-[1000px]:gap-x-6 min-[1000px]:gap-y-5">
      <h1 className="text-[32px] leading-tight font-bold text-(--ap-ink) max-[767px]:sr-only min-[1000px]:col-span-2">Documents</h1>
      {todo.length > 0 ? (
        <section aria-labelledby="docs-todo">
          <h2 id="docs-todo" className="mb-3 text-[18px] font-bold text-(--ap-ink)">
            Needs you <span className="text-[15px] font-semibold text-(--ap-muted) tabular-nums">{todo.length}</span>
          </h2>
          <ul className="grid grid-cols-1 gap-3">{todo.map((d) => item(d))}</ul>
        </section>
      ) : (
        <div className={`flex items-center gap-3.5 rounded-[22px] p-4 ${PASTEL.sage} ${LIFT}`} role="status">
          <Disc icon={CircleCheck} size={48} />
          <p className="leading-snug">
            <b className="block text-[17px] text-(--ap-ink)">No uploads needed right now</b>
            <span className="text-[14px] text-(--ap-ink-2)">Check each document below for its review status.</span>
          </p>
        </div>
      )}
      {done.length > 0 ? (
        <section aria-labelledby="docs-done">
          <h2 id="docs-done" className="mb-3 text-[18px] font-bold text-(--ap-ink)">
            On file <span className="text-[15px] font-semibold text-(--ap-muted) tabular-nums">{done.length}</span>
          </h2>
          <ul className={`${PANEL} overflow-hidden`}>{done.map((d) => item(d, true))}</ul>
        </section>
      ) : null}
      <p className="px-1 text-[14px] text-(--ap-muted) min-[1000px]:col-span-2">{FORMATS}. Only upload what Beeliv has asked for.</p>
    </div>
  );
}
