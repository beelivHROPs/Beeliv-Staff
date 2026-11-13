"use client";

/**
 * File slots for the Documentation form (passport photograph, copy of NIN).
 *
 * Mirrors components/applicant/apply/StepDocuments.tsx's fake upload: a
 * progress row for ~1.3s, then the file NAME is recorded. No file is read,
 * uploaded or stored anywhere — real storage is Stage 2C (sensitive
 * documents), per CLAUDE.md. An existing profile document (e.g. the Valid ID
 * NIN slip, the passport photograph) is shown as "Already provided" and can
 * be replaced for this form.
 *
 * Max 5 MB per file: Confirmed Requirement (BEELIV-APPLICANT-JOURNEY.md §4,
 * database-architecture.md §10). Accepted FORMATS are still "Requires
 * Management Clarification" — the list below matches the Apply flow's.
 */
import { useEffect, useRef, useState } from "react";
import { Check, Upload, type LucideIcon } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { CHIP, LINK_CLS, STROKE } from "@/components/applicant/apply/parts";

const FAKE_UPLOAD_MS = 1300;
const MAX_BYTES = 5 * 1024 * 1024;

function UploadRow({
  icon: Icon,
  title,
  detail,
  status,
  progress,
  action,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  status: React.ReactNode;
  progress?: boolean;
  action?: React.ReactNode;
}) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!progress) return;
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-(--ap-line) bg-white px-3.5 py-3 max-[640px]:grid max-[640px]:grid-cols-[40px_minmax(0,1fr)_auto] max-[640px]:gap-x-3 max-[640px]:gap-y-0.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f8f3fa] text-(--ap-violet) max-[640px]:row-span-2">
        <Icon className="size-5" strokeWidth={STROKE} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 max-[640px]:col-start-2">
        <b className="block text-[14px]">{title}</b>
        <span className="ap-sm block truncate">{detail}</span>
        {progress ? (
          <div className="mt-1.5 h-1 overflow-hidden rounded-[2px] bg-(--ap-line-2)" aria-hidden="true">
            <i className="block h-full bg-(--ap-violet) transition-[width] duration-[1200ms] ease-in-out" style={{ width: filled ? "100%" : "0%" }} />
          </div>
        ) : null}
      </div>
      <span className="flex shrink-0 items-center max-[640px]:col-start-2 max-[640px]:row-start-2 max-[640px]:justify-self-start" aria-live="polite">
        {status}
      </span>
      {action ? <span className="ml-2.5 flex shrink-0 items-center max-[640px]:col-start-3 max-[640px]:row-span-2 max-[640px]:row-start-1 max-[640px]:ml-0">{action}</span> : null}
    </div>
  );
}

function DropZone({ title, accept, formats, onFile }: { title: string; accept: string; formats: string; onFile: (file: File) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      className={`ap-drop relative ${over ? "ap-drop-over !border-(--ap-violet) !bg-(--ap-tint)" : ""} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--ap-violet)`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <Upload className="size-6.5 text-(--ap-violet)" strokeWidth={STROKE} aria-hidden="true" />
      <b className="text-[15px]">{title}</b>
      <span className="text-[13px] text-(--ap-muted)">
        Drag a file here or <u>browse</u> · {formats} up to 5 MB
      </span>
      <input
        type="file"
        accept={accept}
        className="absolute size-px opacity-0"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function ReplaceLink({ label, accept, onFile }: { label: string; accept: string; onFile: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={LINK_CLS} onClick={() => ref.current?.click()} aria-label={`Replace ${label}`}>
        Replace
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

export type FileKind = "photo" | "document";
const ACCEPT: Record<FileKind, { accept: string; formats: string }> = {
  photo: { accept: ".jpg,.jpeg,.png", formats: "JPG or PNG" },
  document: { accept: ".pdf,.jpg,.jpeg,.png", formats: "PDF, JPG or PNG" },
};

/**
 * One document slot: drop zone → uploading → uploaded (with Replace), or an
 * "Already provided" row when the applicant's existing document is reused.
 */
export function FileSlot({
  title,
  icon,
  kind,
  existingFileName,
  uploadedFileName,
  onUploaded,
}: {
  title: string;
  icon: LucideIcon;
  kind: FileKind;
  /** File name of a reusable document already on the applicant's record. */
  existingFileName: string | null;
  /** File name uploaded in this form (overrides the existing one). */
  uploadedFileName: string | null;
  onUploaded: (fileName: string) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const { accept, formats } = ACCEPT[kind];

  function take(file: File) {
    if (file.size > MAX_BYTES) {
      toast.add({ title: `That file is larger than 5 MB. Please choose a smaller ${kind === "photo" ? "photo" : "file"}.` });
      return;
    }
    setUploading(file.name);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onUploaded(file.name);
      setUploading(null);
    }, FAKE_UPLOAD_MS);
  }

  if (uploading) {
    return <UploadRow icon={icon} title={title} detail={uploading} progress status={<span className={CHIP.info}>Uploading</span>} />;
  }
  if (uploadedFileName) {
    return (
      <UploadRow
        icon={icon}
        title={title}
        detail={uploadedFileName}
        status={<span className={CHIP.ok}>Uploaded</span>}
        action={<ReplaceLink label={title} accept={accept} onFile={take} />}
      />
    );
  }
  if (existingFileName) {
    return (
      <UploadRow
        icon={icon}
        title={title}
        detail={existingFileName}
        status={
          <span className="inline-flex items-center gap-1.5 text-[14px] font-bold whitespace-nowrap text-(--ap-ok)">
            <Check className="size-4" strokeWidth={STROKE} aria-hidden="true" />
            Already provided
          </span>
        }
        action={<ReplaceLink label={title} accept={accept} onFile={take} />}
      />
    );
  }
  return <DropZone title={title} accept={accept} formats={formats} onFile={take} />;
}
