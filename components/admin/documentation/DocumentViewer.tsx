"use client";

/**
 * Admin document viewer (spec 30.2). This is the ONE record reachable from the
 * central queue, Applicant 360 and Staff 360 (opened by internal id; nothing is
 * duplicated). There is no file storage in the prototype, so the preview is a
 * placeholder frame. Sensitive values are masked by the adapter and only the
 * masked text is shown; revealing one is a logged, authorised action that is
 * not available here. Hiding a button is presentation only: the backend must
 * re-check every action and write the audit record.
 * Reused: confirmAction, EmptyState, StatusChip (client), ErrorPanel, Disc, Initials,
 * DETAIL_TITLE, formatDate/formatTime.
 */
import { SensitiveNote, SensitiveValue } from "@/components/admin/SensitiveValue";
import Link from "next/link";
import { useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Check, ChevronLeft, Exclaim, Eye, FileText, LockKeyhole, ShieldCheck, X } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Disc } from "@/components/admin/overview/Disc";
import { Initials } from "@/components/admin/overview/Sections";
import { applicantHref } from "@/lib/admin/links";
import { replaceDocument, requestResubmission, useDocument, verifyDocument } from "@/lib/admin/documentation/hooks";
import { DOCUMENTATION_HREF, staffRecordHref } from "@/lib/admin/documentation/links";
import type { DocumentRecord } from "@/lib/admin/documentation/types";
import { playAdminSound, type SoundName } from "@/lib/admin/sound";
import { formatDate, formatTime } from "@/lib/applicant/time";
import { adminFileKey } from "@/lib/demo-files/keys";
import { useDemoFileMeta } from "@/lib/demo-files/hooks";
import { AdminFilePreview } from "./DemoFile";
import { DocStatusChip, docTypeIcon, formatSize } from "./parts";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { ReasonSheet } from "./ReasonSheet";

type Notice = { kind: "ok" | "error"; text: string };
const CARD = "ap-card rounded-[20px] p-5 min-[768px]:p-6";
const H2 = "text-[17px] font-bold text-(--ap-ink)";
const DT = "text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase";
const when = (iso: string) => `${formatDate(iso)}, ${formatTime(iso)}`;

export function DocumentViewer({ id }: { id: string }) {
  const live = useDocument(id);
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const demoKey = live.data ? adminFileKey(live.data.owner.id, live.data.docType, !!live.data.filename) : null;
  const demoMeta = useDemoFileMeta(demoKey);

  if (live.status === "error" || live.status === "restricted") {
    return (
      <>
        <Back />
        <ErrorPanel title={live.status === "restricted" ? "This document is not available for this account" : "We could not load this document"} retry={live.retry} />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className={CARD}>
          <EmptyState icon={FileText} title="Document not found" description="This document does not exist or is outside your access." />
        </div>
      </>
    );
  }
  const d = live.data;
  if (!d) return <ViewerSkeleton />;
  const doc: DocumentRecord = d;
  const Icon = docTypeIcon(doc.docType);
  const personHref = doc.owner.kind === "staff" ? staffRecordHref(doc.owner.id) : applicantHref(doc.owner.id);
  const c = doc.capabilities;

  async function run(work: () => Promise<DocumentRecord>, okText: string, errText: string, sound?: SoundName) {
    setBusy(true);
    try {
      live.setData(await work());
      setNotice({ kind: "ok", text: okText });
      if (sound) playAdminSound(sound); // only after the adapter confirmed
    } catch {
      setNotice({ kind: "error", text: errText });
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    await confirmAction({
      tone: "neutral",
      icon: ShieldCheck,
      title: `Verify ${doc.docType} for ${doc.owner.name}?`,
      description: "The document is marked verified.",
      points: ["Your name and the time are recorded in the document history.", "The previous status and the new status are both recorded."],
      confirmLabel: "Verify document",
      onConfirm: () => run(() => verifyDocument(doc.id), "The document was verified.", "We could not verify the document. Nothing was changed. Please try again.", "approved"),
    });
  }

  async function onResubmission(reason: string) {
    setSheet(false);
    await confirmAction({
      tone: "caution",
      title: `Ask ${doc.owner.name} to resubmit?`,
      description: "The person is asked to upload a new version.",
      points: ["Your reason is recorded in the history and shown with the request.", "The current file is kept in the version history."],
      confirmLabel: "Request resubmission",
      onConfirm: () => run(() => requestResubmission(doc.id, { reason }), "Resubmission was requested.", "We could not send the request. Nothing was changed. Please try again.", "saved"),
    });
  }

  async function onReplace() {
    await confirmAction({
      tone: "neutral",
      title: doc.versions.length ? "Add a new version?" : "Upload on the person's behalf?",
      description: "No file is stored in this demo, so a placeholder version is recorded.",
      points: ["Earlier versions stay in the version history.", "The document goes back to Needs review."],
      confirmLabel: doc.versions.length ? "Add new version" : "Upload",
      onConfirm: () => run(() => replaceDocument(doc.id), "A new version was added.", "We could not add the version. Nothing was changed. Please try again."),
    });
  }

  return (
    <div>
      <Back />

      {notice ? (
        <div role={notice.kind === "error" ? "alert" : "status"} className="ap-card mb-4 flex items-center gap-3 rounded-2xl p-3.5">
          <Disc icon={notice.kind === "ok" ? Check : Exclaim} tone={notice.kind === "ok" ? "ok" : "urgent"} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink)">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="ap-hit flex size-10 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <header className={`${CARD} mb-4 flex flex-wrap items-center gap-4`}>
        <Disc icon={Icon} className="size-12" />
        <div className="min-w-0 flex-1">
          <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{doc.docType}</h1>
          <p className="mt-1 text-[14px] text-(--ap-muted)">
            {doc.stage === "application" ? "Application document" : "Pre-employment document"}
            {doc.versions.length ? `, version ${doc.versions.length}` : ""}
          </p>
        </div>
        <DocStatusChip status={doc.status} />
      </header>

      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={CARD} aria-labelledby="preview-h">
            <h2 id="preview-h" className={`${H2} mb-3`}>
              Preview
            </h2>
            <AdminFilePreview
              fileKey={demoKey}
              ownerName={doc.owner.name}
              sensitiveLabel={doc.sensitive?.label}
              subject={{ kind: doc.owner.kind, inScope: true }}
              href={`/admin/recruitment/documentation/${doc.id}`}
              fallback={
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-(--ap-line) bg-(--ap-tint-soft) p-6 text-center min-[768px]:min-h-[380px]">
              <Disc icon={doc.filename ? Eye : FileText} />
              <p className="text-[15px] font-semibold text-(--ap-ink)">{doc.filename ? "Secure preview opens here once storage is connected" : "No file has been uploaded yet"}</p>
              {doc.filename ? (
                <p className="text-[13px] break-all text-(--ap-muted)">
                  {doc.filename}
                  {doc.sizeBytes ? ` (${formatSize(doc.sizeBytes)})` : ""}
                </p>
              ) : (
                <p className="max-w-[40ch] text-[13px] text-(--ap-muted)">When the person uploads it, the file shows here for review.</p>
              )}
            </div>
              }
            />
          </section>

          <section className={CARD} aria-labelledby="versions-h">
            <h2 id="versions-h" className={`${H2} mb-3`}>
              Version history
            </h2>
            {doc.versions.length === 0 ? (
              <p className="text-[14px] text-(--ap-muted)">No versions yet.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {[...doc.versions].reverse().map((v) => (
                  <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 border-b border-(--ap-line-2) py-3 first:pt-0 last:border-b-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold break-all text-(--ap-ink)">
                        Version {v.version}: {v.filename}
                      </p>
                      <p className="text-[13px] text-(--ap-muted)">
                        {formatSize(v.sizeBytes)}, uploaded by {v.uploadedBy}, {when(v.uploadedAt)}
                      </p>
                    </div>
                    {v.current ? <StatusChip tone="plum">Current</StatusChip> : <StatusChip tone="mute">Earlier</StatusChip>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={CARD} aria-labelledby="history-h">
            <h2 id="history-h" className={`${H2} mb-3`}>
              Activity history
            </h2>
            {doc.history.length === 0 ? (
              <p className="text-[14px] text-(--ap-muted)">Nothing has happened to this document yet.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {[...doc.history].reverse().map((h) => (
                  <li key={h.id} className="border-b border-(--ap-line-2) py-3 first:pt-0 last:border-b-0 last:pb-0">
                    <p className="text-[14px] text-(--ap-ink)">
                      <b>{h.action}</b> by {h.actor}
                    </p>
                    {h.previous || h.next ? (
                      <p className="text-[13px] text-(--ap-ink-2)">
                        {h.previous ?? "None"} to {h.next ?? "None"}
                      </p>
                    ) : null}
                    {h.note ? <p className="mt-1 text-[13px] text-(--ap-ink-2)">Reason: {h.note}</p> : null}
                    <p className="text-[12px] text-(--ap-muted)">{when(h.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className={CARD} aria-labelledby="actions-h">
            <h2 id="actions-h" className={`${H2} mb-3`}>
              Actions
            </h2>
            <div className="flex flex-col gap-2.5">
              {c.canVerify ? (
                <button type="button" disabled={busy} onClick={() => void onVerify()} className="ap-btn ap-btn-p h-11 text-white!">
                  <ShieldCheck className="size-4" aria-hidden="true" /> Verify / Approve
                </button>
              ) : null}
              <ActionsMenu
                disabled={busy}
                items={[
                  ...(c.canRequestResubmission ? [{ label: "Request resubmission", onSelect: () => setSheet(true) }] : []),
                  ...(c.canReplace ? [{ label: doc.versions.length ? "Replace with a new version" : "Upload on their behalf", onSelect: () => void onReplace() }] : []),
                ]}
              />
              {!c.canVerify && !c.canRequestResubmission && !c.canReplace ? <p className="text-[14px] text-(--ap-muted)">No actions are available for this document in its current status.</p> : null}
              <p className="text-[13px] text-(--ap-muted)">{demoMeta ? "Opening and downloading are logged actions in the live system. This demo file stays in this browser." : "Secure open and download are logged actions, not available in the demo."}</p>
              <p className="text-[12px] text-(--ap-muted)">Which actions an HR Officer and an HR Manager each have needs Beeliv confirmation.</p>
            </div>
          </section>

          <section className={CARD} aria-labelledby="details-h">
            <h2 id="details-h" className={`${H2} mb-3`}>
              Details
            </h2>
            <div className="mb-4 flex items-center gap-3">
              <Initials name={doc.owner.name} size="size-10" />
              <div className="min-w-0 leading-tight">
                <Link href={personHref} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                  {doc.owner.name}
                </Link>
                <span className="block text-[12px] text-(--ap-muted) capitalize">
                  {doc.owner.kind}, {doc.owner.reference}
                </span>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-[14px] min-[520px]:grid-cols-2 min-[1100px]:grid-cols-1 min-[1280px]:grid-cols-2">
              <Field label="Document type" value={doc.docType} />
              <Field label="Status" value={<DocStatusChip status={doc.status} />} />
              <Field label="Reference" value={doc.reference} />
              <Field label={doc.owner.kind === "staff" ? "Staff context" : "Vacancy"} value={doc.context} />
              <Field label="Upload date" value={doc.uploadedAt ? when(doc.uploadedAt) : "Not uploaded"} />
              <Field label="Uploaded by" value={doc.uploader ? `${doc.uploader.name} (${doc.uploader.source})` : "Not uploaded"} />
              <Field label="Reviewer" value={doc.reviewer ?? "Unassigned"} />
              <Field label="Verified" value={doc.verifiedAt ? `${doc.verifiedBy}, ${when(doc.verifiedAt)}` : "Not yet"} />
              <Field label="Required action" value={doc.requiredAction} />
            </dl>
            <div className="mt-4 border-t border-(--ap-line-2) pt-3">
              <p className={DT}>Notes</p>
              <p className="mt-1 text-[14px] text-(--ap-ink-2)">{doc.note ?? "No notes."}</p>
            </div>
          </section>

          {doc.sensitive ? (
            <section className={CARD} aria-labelledby="sens-h">
              <h2 id="sens-h" className={`${H2} mb-3`}>
                Sensitive detail
              </h2>
              <div className="flex items-center gap-3">
                <Disc icon={LockKeyhole} />
                <div className="min-w-0">
                  <SensitiveValue label={doc.sensitive.label} masked={doc.sensitive.masked} record={`${doc.sensitive.label}, ${doc.owner.name}`} subject={{ kind: doc.owner.kind, inScope: true }} />
                  <SensitiveNote className="mt-1 text-[13px] text-(--ap-muted)">{doc.sensitive.label} is masked. Only the last digits are shown.</SensitiveNote>
                </div>
              </div>
              <SensitiveNote hideForOps className="mt-3 text-[13px] text-(--ap-muted)">Revealing the full value needs a reason and is recorded.</SensitiveNote>
            </section>
          ) : null}
        </aside>
      </div>

      {sheet ? (
        <ReasonSheet
          title={`Request resubmission from ${doc.owner.name}`}
          description="Tell the person what is wrong with this document and what to upload instead."
          confirmLabel="Continue"
          onCancel={() => setSheet(false)}
          onSubmit={(reason) => void onResubmission(reason)}
        />
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={DT}>{label}</dt>
      <dd className="mt-0.5 break-words text-(--ap-ink-2)">{value}</dd>
    </div>
  );
}

function Back() {
  return (
    <Link href={DOCUMENTATION_HREF} className="mb-3 inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-(--ap-muted) hover:text-(--ap-ink)">
      <ChevronLeft className="size-4" aria-hidden="true" /> Documentation
    </Link>
  );
}

function ViewerSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading document">
      <div className={`${sk} mb-4 h-20`} />
      <div className="grid gap-4 min-[1100px]:grid-cols-[1.5fr_1fr]">
        <div className={`${sk} h-[420px]`} />
        <div className={`${sk} h-[420px]`} />
      </div>
    </div>
  );
}
