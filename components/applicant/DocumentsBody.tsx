"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SlotReplace } from "./apply/UploadSlot";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FilePenLine,
  FileText,
  FolderOpen,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { DocumentPreviewDialog } from "@/components/shared/documents/DocumentPreview";
import { intakeFile } from "@/components/shared/documents/intake";
import { applicantFileKey } from "@/lib/demo-files/keys";
import { useDemoFileMeta, useDemoFilesEnabled } from "@/lib/demo-files/hooks";
import { downloadDemoFile, formatBytes } from "@/lib/demo-files/store";
import { DOCUMENT_TYPES, documentTypeOf, type DocumentTypeInfo } from "@/lib/applicant/reference-data";
import { addOptionalDocument, fulfilPreEmploymentDocument, replaceDocumentFile, useApplicantStore } from "@/lib/applicant/service";
import { formatDate, formatDueLabel, formatRelativePast } from "@/lib/applicant/time";
import type { ApplicantDocument, DocumentTypeKey } from "@/lib/applicant/types";
import { confirmAction } from "./ConfirmDialog";
import { DOC_TYPE_ICON, documentIcon, documentStatus } from "./document-meta";
import { ContactInput } from "./form-fields";
import { FieldError, useFlagInvalid } from "./form-feedback";
import { Chip, PageHeading, EmptyState } from "./primitives";
import { Reveal } from "./motion";
import { CARD, IconTile, sectionTitleClass } from "./SectionCard";
import { SelectMenu } from "./SelectMenu";

const ICON_BTN =
  "inline-flex size-12 items-center justify-center rounded-xl text-(--ap-ink-2) hover:bg-(--ap-line-2) focus-visible:outline-2 focus-visible:outline-(--ap-violet)";

/** Module-level so the id (and the demo file key built from it) is chosen in an event handler, not during render. */
const newDocId = (type: string) => `doc-${type}-${Date.now()}`;

export function DocumentsBody() {
  const store = useApplicantStore();
  // "Requested by Beeliv" = pre-employment items tied to an application. Optional
  // documents the applicant added themselves (e.g. "Other supporting documents")
  // sit in the stored list even when their category is pre-employment.
  // Only what Beeliv is still waiting on stays here: once it is sent it moves to the list of documents (status "In review").
  const requested = store.documents.filter((d) => d.category === "pre-employment" && d.forApplicationId && d.status === "action-required");
  const verifyingApps = store.applications.filter((a) => a.lifecycle === "submitted" && a.stage === 4 && a.next?.label === "Documentation submitted");
  const applicationDocs = store.documents.filter((d) => !requested.includes(d));
  const [adding, setAdding] = useState(false);
  const openCount = requested.filter((r) => r.status === "action-required").length;
  const sentBackCount = applicationDocs.filter((d) => d.status === "action-required").length;
  const todoCount = openCount + sentBackCount;

  // Deep links from a notification or the application page (#doc-<id>) scroll to the document.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "center" }), 250);
    return () => window.clearTimeout(t);
  }, []);
  const verifiedCount = applicationDocs.filter((d) => d.status === "verified").length;
  const inReviewCount = applicationDocs.filter((d) => d.status === "pending-review").length;

  if (store.documents.length === 0) {
    return (
      <div>
        <PageHeading title="Documents" subtitle="Stored once, reused across your applications." />
        <div className={CARD}>
          <EmptyState
            glass="documents"
            icon={FolderOpen}
            title="No documents yet"
            description="Your CV, photo and ID live here once you add them. You upload each one once and reuse it on every application."
            action={
              <div className="flex flex-col items-center gap-2.5 min-[480px]:flex-row">
                <Link href="/applicant/jobs" className="ap-btn ap-btn-p ap-btn-hero text-white! hover:text-white!">
                  Find a role to apply for
                </Link>
                <Link href="/applicant/profile" className="ap-btn ap-btn-o">
                  Complete my profile
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="Documents" subtitle="Stored once, reused across your applications. Only verified files are shared with employers." />

      {/* Applications at the Documentation stage (index 3) → the onboarding documentation form */}
      {store.applications
        .filter((a) => a.lifecycle === "submitted" && a.stage === 3)
        .map((a) => (
          <Link
            key={a.id}
            href={`/applicant/applications/${a.id}/documentation`}
            className={`ap-card ap-card-hover mb-5 flex ${requested.length > 0 ? "max-[767px]:hidden" : ""}  items-center gap-3.5 border-[#FCD34D]! bg-[#FFFBEB]! p-4 text-(--ap-ink)! max-[640px]:items-start`}
          >
            <IconTile icon={FilePenLine} tone="a" className="size-11 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <b className="block text-[15px]">Complete your documentation for {a.role}</b>
              <span className="block text-[13px] text-(--ap-muted)">
                {a.company}<span className="max-[767px]:hidden"> · personal details, employment, next of kin, NIN & bank details, and the onboarding terms</span>
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
          </Link>
        ))}

      {/* Calm confirmation once the documentation form is sent. */}
      {verifyingApps.map((a) => (
        <Link key={a.id} href={`/applicant/applications/${a.id}`} className="mb-5 flex items-center gap-3.5 rounded-[22px] bg-[#F1E8F7] p-4 text-(--ap-ink)!">
          <IconTile icon={Check} className="size-11 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1">
            <b className="block text-[15px]">Documentation submitted</b>
            <span className="block text-[14px] text-(--ap-ink-2)">Beeliv is verifying it for {a.role} at {a.company}.</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
        </Link>
      ))}

      <p className="mb-4 text-[15px] text-(--ap-muted)">
        {verifiedCount} approved · {inReviewCount} in review · {todoCount} to do
      </p>

      <div className={requested.length > 0 ? "grid grid-cols-[minmax(0,1fr)] items-start gap-x-6 min-[1100px]:grid-cols-2" : ""}>
      {requested.length > 0 ? (
        <Reveal as="section" className="mb-[22px] max-[767px]:rounded-[22px] max-[767px]:bg-[#F1E8F7] max-[767px]:p-4" aria-labelledby="req-h">
          <div className="mb-[18px] flex items-center justify-between gap-3 max-[767px]:mb-3">
            <h2 id="req-h" className={sectionTitleClass()}>
              Requested by Beeliv
            </h2>
            {openCount ? <Chip tone="warn">{`${openCount} to do`}</Chip> : null}
          </div>
          {openCount === 0 ? (
            <div className="mb-3 flex items-start gap-3 rounded-2xl border border-[#B9E6C9] bg-[#EAF8EF] p-3.5 text-[15px] text-[#14532D]">
              <Check className="mt-0.5 size-5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              <span>
                <b className="block">All documents sent</b>
                Beeliv will review them within 1 working day and tell you here.
              </span>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 max-[767px]:gap-0">
            {requested.map((r) => {
              const app = store.applications.find((a) => a.id === r.forApplicationId);
              return <RequiredDocCard key={r.id} doc={r} applicationLabel={app ? `${app.role} · ${app.company}` : ""} />;
            })}
          </div>
          {/* Phone: the documentation form is the last row of the same request card, not a second sand card. */}
          {store.applications
            .filter((a) => a.lifecycle === "submitted" && a.stage === 3)
            .map((a) => (
              <Link
                key={a.id}
                href={`/applicant/applications/${a.id}/documentation`}
                className="mt-1 hidden min-h-12 items-center justify-between gap-3 border-t border-[#E6D9B8] pt-3 text-[15px] font-semibold max-[767px]:flex"
              >
                <span>Complete your documentation for {a.role}</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            ))}
        </Reveal>
      ) : null}

      <div className="min-w-0">
      <Reveal as="section" className={CARD} aria-labelledby="appdocs-h">
        <div className="mb-[18px] flex items-center justify-between gap-3 max-[640px]:flex-wrap">
          <h2 id="appdocs-h" className={sectionTitleClass()}>
            Application documents
          </h2>
          {adding ? null : (
            <button type="button" onClick={() => setAdding(true)} className="ap-btn ap-btn-s ap-btn-sm">
              <Plus className="size-4" aria-hidden="true" />
              Add document
            </button>
          )}
        </div>
        {adding ? <AddDocumentPanel onClose={() => setAdding(false)} /> : null}
        {applicationDocs.length === 0 ? (
          <div className="border-t border-(--ap-line-2)">
            <EmptyState
              glass="documents"
              icon={FolderOpen}
              title="No application documents yet"
              description="Add your CV, a passport photograph and a valid ID. They are saved once and reused on every application."
              action={
                adding ? undefined : (
                  <button type="button" onClick={() => setAdding(true)} className="ap-btn ap-btn-p ap-btn-hero">
                    <Plus className="size-4" aria-hidden="true" />
                    Add document
                  </button>
                )
              }
            />
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {applicationDocs.map((d) => (
              <DocRow key={d.id} doc={d} />
            ))}
          </ul>
        )}
        <div className="mt-5 flex gap-2.5 rounded-xl bg-(--ap-tint) p-3.5 text-sm text-(--ap-ink-2)">
          <LockKeyhole className="mt-0.5 size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
          <span>
            Saved documents are reused automatically on new applications. Guarantor, references and medical/fitness documents are only
            requested later, if you reach that stage.
          </span>
        </div>
      </Reveal>

      <DocumentChecklist documents={store.documents} />
      </div>
      </div>
    </div>
  );
}

const STATUS_RANK = { verified: 2, "pending-review": 1, "action-required": 0 } as const;

/**
 * Module 1 §3 "Document Checklist": every document type with the doc's own
 * Required column and status wording. A type with no record yet shows
 * "Pending". Phones stack the Required text under the name.
 */
function DocumentChecklist({ documents }: { documents: ApplicantDocument[] }) {
  const rows = DOCUMENT_TYPES.map((t) => {
    const best = documents
      .filter((d) => documentTypeOf(d)?.key === t.key)
      .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])[0];
    return { t, best };
  });
  const group = (category: DocumentTypeInfo["category"]) => rows.filter((r) => r.t.category === category);
  return (
    <Reveal as="section" className={`${CARD} mt-[22px]`} aria-labelledby="checklist-h">
<details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <IconTile icon={FileCheck2} className="size-10 rounded-[12px]" iconClassName="size-5" />
        <h2 id="checklist-h" className={`${sectionTitleClass()} flex-1`}>
          Document checklist
        </h2>
        <ChevronDown className="size-5 shrink-0 text-(--ap-muted) transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="ap-sm mt-1.5 mb-4">You don&apos;t need everything to apply. Pre-employment documents are only requested once you reach that stage.</p>
      {(["application", "pre-employment"] as const).map((cat) => (
        <div key={cat} className="[&+&]:mt-5">
          <div className="ap-eb mb-1">{cat === "application" ? "Application documents" : "Pre-employment documents"}</div>
          <div role="table" aria-label={cat === "application" ? "Application documents checklist" : "Pre-employment documents checklist"}>
            <div
              role="row"
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 py-2 text-[13px] font-semibold text-(--ap-muted) max-[640px]:hidden"
            >
              <span role="columnheader">Document</span>
              <span role="columnheader">Required</span>
              <span role="columnheader" className="text-right">
                Status
              </span>
            </div>
            {group(cat).map(({ t, best }) => {
              const Icon = DOC_TYPE_ICON[t.key];
              const status = best ? documentStatus(best) : { label: "Pending", tone: "warn" as const };
              return (
                <div
                  role="row"
                  key={t.key}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-3 border-t border-(--ap-line-2) py-2.5 max-[640px]:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span role="cell" className="flex min-w-0 items-center gap-2.5">
                    <Icon className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
                    <span className="min-w-0">
                      <b className="block text-[15px] font-semibold">{t.label}</b>
                      {t.example ? <span className="block text-[13px] text-(--ap-muted)">{t.example}</span> : null}
                      <span className="block text-[13px] text-(--ap-muted) min-[641px]:hidden">Required: {t.required}</span>
                    </span>
                  </span>
                  <span role="cell" className="text-sm text-(--ap-ink-2) max-[640px]:hidden">
                    {t.required}
                  </span>
                  <span role="cell" className="justify-self-end">
                    {best ? <Chip tone={status.tone}>{status.label}</Chip> : <span className="text-[14px] text-(--ap-muted)">{status.label}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
</details>
    </Reveal>
  );
}

/**
 * "Add document": the applicant picks one of the optional Module 1 §3 types
 * (DOCUMENT_TYPES[].selfAdd), then chooses a file. Mock only — the file never
 * leaves the browser; the record is saved to localStorage for review.
 */
function AddDocumentPanel({ onClose }: { onClose: () => void }) {
  const options = DOCUMENT_TYPES.filter((t) => t.selfAdd);
  const [type, setType] = useState<DocumentTypeKey | "">("");
  const info = options.find((t) => t.key === type);

  const ownerName = useApplicantStore().profile.fullName;
  async function accept(file: File | undefined) {
    if (!file || !info) return;
    const id = newDocId(info.key);
    const size = await intakeFile(file, applicantFileKey({ id, docType: info.key }), ownerName, info.label);
    if (size === false) return;
    void addOptionalDocument(info.key, file.name, size, id);
    toast.add({ title: `${info.label} added. Beeliv will review it within 1 working day.`, type: "success" });
    onClose();
  }

  return (
    <div className="mb-4 rounded-[14px] border border-(--ap-line) bg-[#FBF8FD] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <b className="text-[15px]">Add a document</b>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-12 items-center justify-center rounded-xl text-(--ap-muted) hover:bg-(--ap-line-2) hover:text-(--ap-ink)"
        >
          <X className="size-4.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="add-doc-type" className="text-sm font-semibold text-(--ap-ink-2)">
          Document type
        </label>
        <SelectMenu
          id="add-doc-type"
          placeholder="Choose a document type"
          value={type}
          options={options.map((t) => ({ value: t.key, label: `${t.label} · ${t.required.toLowerCase()}` }))}
          onChange={(v) => setType(v as DocumentTypeKey)}
        />
        {info?.example ? <span className="ap-sm">{info.example.charAt(0).toUpperCase() + info.example.slice(1)}</span> : null}
      </div>
      {info ? (
        <label className="ap-drop relative mt-3.5">
          <Upload className="size-[26px] text-(--ap-violet)" aria-hidden="true" />
          <b className="text-[15px]">Upload {info.label.toLowerCase()}</b>
          <span className="text-[13px] text-(--ap-muted)">
            Tap to <u>browse</u> · PDF, JPG or PNG up to 5 MB
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="absolute size-px opacity-0"
            onChange={(e) => {
              void accept(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

/** Calls a render function from inside its own component (keeps the prototype replace flow unchanged). */
function Plain({ render }: { render: () => ReactNode }) {
  return <>{render()}</>;
}

function DocRow({ doc: d }: { doc: ApplicantDocument }) {
  const ok = d.status === "verified";
  const status = documentStatus(d);
  // Valid ID: show which accepted ID was supplied (e.g. "NIN slip").
  const example = documentTypeOf(d)?.key === "valid-id" && d.description ? d.description : null;
  const used = d.usedInApplicationIds.length;
  const replaceRef = useRef<HTMLInputElement>(null);
  const fileKey = applicantFileKey(d);
  const meta = useDemoFileMeta(fileKey);
  const demo = useDemoFilesEnabled();
  const ownerName = useApplicantStore().profile.fullName;
  const [open, setOpen] = useState(false);
  if (d.status === "action-required" && d.resubmission) {
    return (
      <li id={`doc-${d.id}`} className="scroll-mt-24 border-t border-(--ap-line-2) py-3.5">
        <div className="mb-3 flex items-center gap-3.5">
          <IconTile icon={documentIcon(d)} className="size-11 rounded-xl max-[640px]:size-10" />
          <b className="block min-w-0 text-[15px]">{d.name}</b>
        </div>
        <ResubmitNotice doc={d} />
      </li>
    );
  }
  // The three required application files (CV, passport photo, valid ID) are replaced through the upload
  // adapter: real states, no fake progress. Every other document keeps the prototype flow below.
  const typeKey = documentTypeOf(d)?.key;
  const slot = typeKey === "cv" || typeKey === "passport-photo" || typeKey === "valid-id" ? typeKey : null;
  const legacyReplace = () => {
    // Replacing an already-verified file resets its review, so confirm first.
    if (!ok) return replaceRef.current?.click();
    confirmAction({
      tone: "caution",
      icon: RefreshCw,
      title: `Replace your verified ${d.name}?`,
      description: "Choose the new file on the next step.",
      points: ["The new file goes back to review before it's shared with employers."],
      confirmLabel: "Choose new file",
      onConfirm: () => replaceRef.current?.click(),
    });
  };
  const legacyInput = (
    <input
      ref={replaceRef}
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (!demo) return void toast.add({ title: `${f.name} selected`, description: `Replacing your ${d.name} isn't connected in this preview. Nothing was changed.` });
        void intakeFile(f, fileKey, ownerName, d.name).then((size) => {
          if (size === false) return;
          void replaceDocumentFile(d.id, f.name, size);
          toast.add({ title: `${d.name} replaced. Beeliv will review it within 1 working day.`, type: "success" });
        });
      }}
    />
  );
  const row = (p: { replace: () => void; busy: boolean; input: ReactNode; status: ReactNode }) => (
    <li id={`doc-${d.id}`} className="scroll-mt-24 grid grid-cols-[44px_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] items-center gap-3.5 border-t border-(--ap-line-2) py-3.5 max-[1599px]:grid-cols-[44px_minmax(0,1fr)_auto] max-[640px]:grid-cols-[40px_minmax(0,1fr)] max-[640px]:gap-y-2">
      <IconTile icon={documentIcon(d)} className="size-11 rounded-xl max-[640px]:size-10" />
      <div className="min-w-0">
        <b className="block text-[15px]">
          {d.name}
          {example ? <span className="font-medium text-(--ap-muted)"> · {example}</span> : null}
        </b>
        <span className="block truncate ap-sm">
          {[d.fileName, d.size, d.uploadedOn ? formatDate(d.uploadedOn) : null].filter(Boolean).join(" · ")}
        </span>
      </div>
      <span className="text-[13px] text-(--ap-ink-2) max-[1599px]:hidden">
        {used ? `Used in ${used} application${used === 1 ? "" : "s"}` : "Not used yet"}
        <small className="block text-[13px] text-(--ap-muted)">Reused automatically</small>
      </span>
      <span className="max-[640px]:col-start-2 max-[640px]:justify-self-start">
        <Chip tone={status.tone} icon={ok ? ShieldCheck : Clock3}>
          {status.label}
        </Chip>
      </span>
      <span className="flex gap-1 max-[1599px]:col-start-2 max-[1599px]:col-end-[-1] max-[1599px]:-my-1.5 max-[1599px]:-ml-2.5">
        <button type="button" aria-label={`View ${d.name}`} title="View" onClick={() => (meta ? setOpen(true) : toast.add({ title: "Opens a secure preview", description: demo ? "This sample has no file. Replace it with a real one to try the preview." : undefined }))} className={ICON_BTN}>
          <Eye className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Download ${d.name}`}
          title="Download"
          onClick={() => {
            if (meta) void downloadDemoFile(fileKey).then((ok) => ok || toast.add({ title: "We couldn't open this document", description: "Please try again in a moment.", type: "error" }));
            else toast.add({ title: `Downloads ${d.fileName ?? d.name}`, description: demo ? "This sample has no file. Replace it with a real one to try the download." : "File storage isn't connected in this preview." });
          }}
          className={ICON_BTN}
        >
          <Download className="size-5" aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Replace ${d.name}`} title="Replace" disabled={p.busy} onClick={p.replace} className={ICON_BTN}>
          <RefreshCw className="size-5" aria-hidden="true" />
        </button>
        {p.input}
      </span>
      {open && meta ? (
        <DocumentPreviewDialog
          fileKey={fileKey}
          title={d.name}
          ownerName={ownerName}
          label={d.name}
          canReplace
          onReplaced={(m) => void replaceDocumentFile(d.id, m.name, formatBytes(m.size))}
          onClose={() => setOpen(false)}
        />
      ) : null}
      {p.status}
    </li>
  );
  return slot ? <SlotReplace slot={slot} verified={ok} render={row} /> : <Plain render={() => row({ replace: legacyReplace, busy: false, input: legacyInput, status: null })} />;
}

function RequiredDocCard({ doc: r, applicationLabel }: { doc: ApplicantDocument; applicationLabel: string }) {
  const done = r.status !== "action-required";
  const [uploading, setUploading] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [refs, setRefs] = useState({ n1: "", c1: "", n2: "", c2: "" });
  const [refsTried, setRefsTried] = useState(false);
  const refsForm = useRef<HTMLFormElement>(null);
  const flagRefs = useFlagInvalid(refsForm);
  const [barFull, setBarFull] = useState(false);
  const Icon = documentIcon(r);
  const status = documentStatus(r);

  // Animate the progress bar from 0 -> 100% once the uploaded state paints (wireframe .upl .pb data-w).
  useEffect(() => {
    if (!uploading && !done) return;
    const id = requestAnimationFrame(() => setBarFull(true));
    return () => cancelAnimationFrame(id);
  }, [uploading, done]);

  const fileKey = applicantFileKey(r);
  const stored = useDemoFileMeta(fileKey);
  // A sample fallback only shows for a document that already has a file.
  const meta = stored?.sample && !r.fileName ? null : stored;
  const ownerName = useApplicantStore().profile.fullName;
  const [viewing, setViewing] = useState(false);

  async function accept(file: File | undefined) {
    if (!file) return;
    const size = await intakeFile(file, fileKey, ownerName, r.name);
    if (size === false) return;
    setBarFull(false);
    setUploading(file.name);
    // Wireframe fakeUpload(): ~1.3s simulated transfer. The file stays in this browser (demo store).
    window.setTimeout(() => {
      void fulfilPreEmploymentDocument(r.id, file.name, size);
      setUploading(null);
      toast.add({ title: "Submitted. Beeliv will review it within 1 working day.", type: "success" });
    }, 1300);
  }

  const refsReady = refs.n1.trim() && refs.c1.trim() && refs.n2.trim() && refs.c2.trim();

  return (
    <div id={`doc-${r.id}`} className={done ? "scroll-mt-24 rounded-2xl border border-(--ap-line) bg-white p-[18px] max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0 max-[767px]:py-4 max-[767px]:not-first:border-t max-[767px]:not-first:border-[#E6D9B8]" : "scroll-mt-24 rounded-2xl border border-[#FCD34D] bg-linear-to-b from-[#FFFBEB] to-white p-[18px] max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-none max-[767px]:p-0 max-[767px]:py-4 max-[767px]:not-first:border-t max-[767px]:not-first:border-[#E6D9B8]"}>
      <div className="mb-3.5 flex items-start justify-between gap-3 max-[640px]:flex-wrap">
        <div className="flex gap-3 max-[640px]:flex-[1_1_100%]">
          <IconTile icon={done ? Check : Icon} tone={done ? "ok" : "a"} />
          <div className="min-w-0">
            <b className="block text-base">{r.name}</b>
            <span className="text-[13px] text-(--ap-muted)">{[applicationLabel, r.due ? formatDueLabel(r.due) : ""].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
        {/* A request still waiting on the applicant is already counted in "N to do" above, so on phones its chip is spoken, not repeated on every row. */}
        <span className={`max-[640px]:ml-14 ${done ? "" : "max-[767px]:sr-only"}`}>
          <Chip tone={status.tone}>{status.label}</Chip>
        </span>
      </div>
      {r.resubmission && !done ? <ResubmitNotice doc={r} /> : null}

      {r.description && !done && !r.resubmission ? <p className="ap-bd -mt-1 mb-3.5 text-(--ap-ink-2)">{r.description}</p> : null}

      {r.hasTemplate && !done && !uploading && !r.resubmission ? (
        <button
          type="button"
          onClick={() => toast.add({ title: "Guarantor form template downloaded", type: "success" })}
          className="ap-btn ap-btn-s ap-btn-sm mb-3"
        >
          <Download className="size-4" aria-hidden="true" />
          Download template
        </button>
      ) : null}

      {r.resubmission && !done ? null : done || uploading ? (
        <div className="flex items-center gap-3 rounded-xl border border-(--ap-line) bg-white px-3.5 py-3 max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:px-0 max-[640px]:grid max-[640px]:grid-cols-[40px_minmax(0,1fr)] max-[640px]:gap-x-3 max-[640px]:gap-y-1">
          <IconTile icon={FileText} className="size-10 rounded-[10px] max-[640px]:row-span-2" />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-sm">{uploading ?? r.fileName}</b>
            <span className="block ap-sm" aria-live="polite">
              {uploading
                ? "Uploading…"
                : `Submitted ${r.uploadedOn ? lowerFirst(formatRelativePast(r.uploadedOn)) : "just now"}${r.status === "verified" ? "" : " · Beeliv will review it within 1 working day"}`}
            </span>
            {uploading ? (
              <div className="ap-pb" role="progressbar" aria-label={`Upload progress for ${r.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={barFull ? 100 : 0}>
                <i style={{ width: barFull ? "100%" : "0%" }} />
              </div>
            ) : null}
          </div>
          {/* The row heading above already shows the status, so the file card only shows a chip while uploading. */}
          {uploading ? (
            <span className="max-[640px]:col-start-2 max-[640px]:justify-self-start">
              <Chip tone="mute">Uploading</Chip>
            </span>
          ) : null}
          {meta && !uploading ? (
            <span className="flex gap-1 max-[640px]:col-span-2 max-[640px]:-ml-2.5">
              <button type="button" aria-label={`View ${r.name}`} title="View" onClick={() => setViewing(true)} className={ICON_BTN}>
                <Eye className="size-5" aria-hidden="true" />
              </button>
              <button type="button" aria-label={`Download ${r.name}`} title="Download" onClick={() => void downloadDemoFile(fileKey)} className={ICON_BTN}>
                <Download className="size-5" aria-hidden="true" />
              </button>
            </span>
          ) : null}
        </div>
      ) : r.isReferenceForm ? (
        <form
          ref={refsForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!refsReady) {
              setRefsTried(true);
              flagRefs();
              return;
            }
            void fulfilPreEmploymentDocument(r.id, "Two references added");
            toast.add({ title: "References saved", type: "success" });
          }}
        >
          <div className="flex flex-col gap-4">
            {/* Each reference is its own block: name and role full width, then how to contact them. */}
            <fieldset className="m-0 flex min-w-0 flex-col gap-4 rounded-2xl border border-(--ap-line) bg-white p-4 min-[768px]:p-5">
              <legend className="px-1 text-[13px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">Reference 1</legend>
              <RefField id={`${r.id}-n1`} error={refsTried && !refs.n1.trim() ? "Enter your first reference's name and role." : undefined} label="Name and role" placeholder="e.g. Tunde A., Restaurant Manager" value={refs.n1} onChange={(v) => setRefs({ ...refs, n1: v })} />
              <ContactInput id={`${r.id}-c1`} error={refsTried && !refs.c1.trim() ? "Enter a phone number or email for reference 1." : undefined} label="Contact by" value={refs.c1} onChange={(v) => setRefs({ ...refs, c1: v })} />
            </fieldset>
            <fieldset className="m-0 flex min-w-0 flex-col gap-4 rounded-2xl border border-(--ap-line) bg-white p-4 min-[768px]:p-5">
              <legend className="px-1 text-[13px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">Reference 2</legend>
              <RefField id={`${r.id}-n2`} error={refsTried && !refs.n2.trim() ? "Enter your second reference's name and role." : undefined} label="Name and role" placeholder="e.g. Amaka O., Head Chef" value={refs.n2} onChange={(v) => setRefs({ ...refs, n2: v })} />
              <ContactInput id={`${r.id}-c2`} error={refsTried && !refs.c2.trim() ? "Enter a phone number or email for reference 2." : undefined} label="Contact by" value={refs.c2} onChange={(v) => setRefs({ ...refs, c2: v })} />
            </fieldset>
          </div>
          <button type="submit" className="ap-btn ap-btn-p mt-4 max-[767px]:w-full">
            Save references
          </button>
        </form>
      ) : (
        <label
          className={`ap-drop relative ${over ? "ap-drop-over border-(--ap-violet)! bg-(--ap-tint)!" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void accept(e.dataTransfer.files?.[0]);
          }}
        >
          <Upload className="size-[26px] text-(--ap-violet)" aria-hidden="true" />
          <b className="text-[15px]">Upload {r.name.toLowerCase()}</b>
          <span className="text-[13px] text-(--ap-muted)">
            Drag a file here or <u>browse</u> · PDF, JPG or PNG up to 5 MB
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="absolute size-px opacity-0"
            onChange={(e) => {
              void accept(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {viewing && meta ? <DocumentPreviewDialog fileKey={fileKey} title={r.name} ownerName={ownerName} label={r.name} canReplace onClose={() => setViewing(false)} onReplaced={(m) => void fulfilPreEmploymentDocument(r.id, m.name, formatBytes(m.size))} /> : null}
    </div>
  );
}

/**
 * HR asked for a new file. Shows HR's reason verbatim, the date, and one
 * button. Nothing else from the review (scores, notes, reviewer) is ever
 * available here: the applicant DTO only carries {reason, requestedAt}.
 * Mock upload: the file never leaves the browser.
 */
function ResubmitNotice({ doc: d }: { doc: ApplicantDocument }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const ownerName = useApplicantStore().profile.fullName;
  if (!d.resubmission) return null;

  async function accept(file: File | undefined) {
    if (!file) return;
    const size = await intakeFile(file, applicantFileKey(d), ownerName, d.name);
    if (size === false) return;
    setBusy(true);
    window.setTimeout(() => {
      void fulfilPreEmploymentDocument(d.id, file.name, size);
      toast.add({ title: "Sent. Beeliv will review it within 1 working day.", type: "success" });
    }, 900);
  }

  return (
    <div className="rounded-xl border border-(--ap-line) bg-[#FBF8FD] p-4 max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <Chip tone="warn">Action needed</Chip>
        <span className="text-[14px] whitespace-nowrap text-(--ap-muted)">Asked on {formatDate(d.resubmission.requestedAt)}</span>
      </div>
      <p className="ap-bd m-0 mb-3.5 text-(--ap-ink)">{d.resubmission.reason}</p>
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="ap-btn ap-btn-p ap-btn-hero">
        <Upload className="size-4" aria-hidden="true" />
        {busy ? "Uploading…" : "Upload a new file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void accept(f);
        }}
      />
    </div>
  );
}

function RefField({ id, label, placeholder, value, onChange, error }: { id: string; label: string; placeholder?: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div data-ap-field className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-(--ap-ink-2)">
        {label}
      </label>
      <input id={id} className="ap-input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} />
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
