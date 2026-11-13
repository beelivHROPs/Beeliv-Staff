"use client";

/**
 * "Job photo" section of the vacancy form + the live card preview (PROPOSAL,
 * needs Beeliv confirmation: photo set, department mapping, file rules).
 *
 * - The default photo follows the department (lib/admin/vacancies/jobPhotos).
 *   A slot with no file yet, or no department, shows the branded neutral cover
 *   (soft purple + line icon), never a broken image.
 * - HR can pick a library photo, upload their own (mock: JPG/PNG/WebP up to
 *   5 MB, kept in memory as an object URL only, nothing is stored), or go back
 *   to the default. Alt text is required and public.
 * - The preview renders the Applicant app's own JobCard (read-only, inert), so
 *   the card design is never forked.
 */
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { JobCard } from "@/components/applicant/jobs/JobCard";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { FieldError, invalidAttrs } from "@/components/applicant/form-feedback";
import { Check, ImageIcon, Upload } from "@/components/applicant/icons";
import { defaultPhotoFor, JOB_PHOTO_LIBRARY, libraryById, photoSrc, resolveJobPhoto } from "@/lib/admin/vacancies/jobPhotos";
import type { VacancyConfig, VacancyDetail } from "@/lib/admin/vacancies/types";
import { autoAlt, effectiveAlt, toInput, type FormState } from "./formState";
import { postedText, toApplicantJob } from "./meta";
import { FoldSection as Section } from "@/components/admin/PhoneForm";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file, uniformly (private-cv-upload.md decision)
const ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** Plain-words problem, or null when the file is acceptable. */
function photoProblem(file: File): string | null {
  const okExt = /\.(jpe?g|png|webp)$/i.test(file.name);
  const okType = file.type === "" || /^image\/(jpeg|png|webp)$/.test(file.type);
  if (!okExt || !okType) return "That file is not a JPG, PNG or WebP photo. Please choose one of those.";
  if (file.size === 0) return "That file is empty. Please choose another photo.";
  if (file.size > MAX_BYTES) return "That photo is larger than 5 MB. Please choose a smaller one.";
  return null;
}

/** Branded neutral cover: soft purple, line icon, optional label. Used when there is no photo file. */
function CoverTile({ label, note, className = "" }: { label: string; note?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-col items-center justify-center gap-1 overflow-hidden text-center ${className}`}
      style={{ background: "radial-gradient(#4A06681f 1px, transparent 1.2px) 0 0 / 10px 10px, linear-gradient(135deg, #F6EEF9, #E3CFEE)", color: "#4A0668" }}
    >
      <span className="absolute -top-5 -right-5 size-20 rounded-full bg-white/35" />
      <ImageIcon className="relative size-[26px]" strokeWidth={1.4} />
      <span className="relative px-1 text-[12px] leading-tight font-bold">{label}</span>
      {note ? <span className="relative px-1 text-[11px] leading-tight opacity-80">{note}</span> : null}
    </span>
  );
}

export function JobPhotoSection({
  s,
  config,
  existing,
  onPhoto,
  onAlt,
  altError,
}: {
  s: FormState;
  config: VacancyConfig;
  existing: VacancyDetail | null;
  onPhoto: (p: FormState["photo"]) => void;
  onAlt: (v: string | null) => void;
  altError?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);
  const created = useRef<Set<string>>(new Set()); // object URLs made in this session of the form
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const altId = useId();
  const groupId = useId();

  const current = useRef(s.photo); // latest choice, for the delayed mock upload below
  useEffect(() => {
    current.current = s.photo;
  }, [s.photo]);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const { department } = s;
  const alt = effectiveAlt(s);
  const def = defaultPhotoFor(department);
  const shown = resolveJobPhoto({ ...s.photo, alt }, department, autoAlt(s.title));

  const sourceLabel =
    s.photo.source === "upload"
      ? uploadName
        ? `Your photo: ${uploadName}`
        : "Your own photo"
      : s.photo.source === "library"
        ? `Library photo: ${libraryById(s.photo.ref)?.label ?? ""}`
        : department
          ? def.src
            ? `Default for ${department}`
            : `Default for ${department} (photo coming soon)`
          : "Default photo";

  function release(ref: string) {
    if (created.current.has(ref)) {
      URL.revokeObjectURL(ref);
      created.current.delete(ref);
    }
  }
  function choose(next: FormState["photo"], message: string) {
    if (s.photo.source === "upload" && s.photo.ref !== next.ref) release(s.photo.ref);
    onPhoto(next);
    if (next.source !== "upload") setUploadName(null);
    setProblem(null);
    setNotice(message);
  }

  function pick(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    const bad = photoProblem(file);
    if (bad) {
      setProblem(bad);
      return;
    }
    setProblem(null);
    setBusy(true);
    const url = URL.createObjectURL(file);
    // Mock "upload": a short wait, then check the browser can really read the picture.
    timer.current = window.setTimeout(() => {
      const probe = new window.Image();
      probe.onload = () => {
        created.current.add(url);
        if (current.current.source === "upload" && current.current.ref !== url) release(current.current.ref);
        onPhoto({ source: "upload", ref: url });
        setUploadName(file.name);
        setBusy(false);
        setNotice("Photo added. The preview below is updated.");
      };
      probe.onerror = () => {
        URL.revokeObjectURL(url);
        setBusy(false);
        setProblem("The upload did not work, so your previous photo is still in use. Check the file opens on your device, then try again.");
      };
      probe.src = url;
    }, 700);
  }

  return (
    <Section title="Job photo" summary="Photo on the public job card">
      <p className="mb-4 max-w-[70ch] text-[14px] leading-snug text-(--ap-muted)">
        This photo appears on the public job card. Pick one from the library, upload your own, or keep the default for the department. No client logos, and only photos you have permission to publish.
      </p>

      <div className="grid grid-cols-1 gap-5 @min-[640px]:grid-cols-[260px_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="relative aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[14px] border border-(--ap-line) bg-(--ap-line-2)">
            {busy ? (
              <span role="status" aria-label="Checking the photo" className="ap-shimmer absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-(--ap-muted)">
                Checking photo...
              </span>
            ) : shown.src ? (
              <Image key={shown.src} src={shown.src} alt={shown.alt} fill sizes="320px" className="object-cover" />
            ) : (
              <CoverTile className="absolute inset-0" label={department || "Choose a department"} note={department ? "Photo coming soon" : "to see its default photo"} />
            )}
          </div>
          <p className="mt-2 text-[13px] font-semibold text-(--ap-ink-2)">{sourceLabel}</p>
        </div>

        <div className="min-w-0">
          <h3 id={groupId} className="mb-2 text-[14px] font-semibold text-(--ap-ink-2)">
            Photo library
          </h3>
          <div role="group" aria-labelledby={groupId} className="relative -mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pt-1 pb-2">
            {JOB_PHOTO_LIBRARY.map((p) => {
              const src = photoSrc(p);
              const on = s.photo.source === "library" && s.photo.ref === p.id;
              const isDefault = def.entry?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!src || busy}
                  onClick={() => choose({ source: "library", ref: p.id }, `${p.label} photo selected. The preview below is updated.`)}
                  className={`group w-[104px] shrink-0 snap-start rounded-xl border-2 p-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet) ${
                    on ? "border-(--ap-violet) bg-(--ap-line-2)" : "border-transparent hover:border-(--ap-line)"
                  } ${!src ? "cursor-not-allowed" : ""}`}
                >
                  <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-(--ap-line-2)">
                    {src ? <Image src={src} alt="" fill sizes="104px" className="object-cover" /> : <CoverTile className="absolute inset-0" label={p.label} note="Soon" />}
                    {isDefault ? <span className="absolute top-1 left-1 rounded-full bg-black/60 px-1.5 py-px text-[10px] font-bold text-white">Default</span> : null}
                    {on ? (
                      <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-(--ap-violet) text-white">
                        <Check className="size-3" strokeWidth={2.2} aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-[12px] font-semibold text-(--ap-ink-2)">
                    {p.label}
                    {isDefault ? <span className="sr-only"> (default for this department)</span> : null}
                  </span>
                  {!src ? <span className="sr-only">Photo coming soon, not available yet</span> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="ap-btn ap-btn-s ap-btn-sm">
              <Upload className="size-4" aria-hidden="true" /> {s.photo.source === "upload" ? "Upload a different photo" : "Upload your own"}
            </button>
            <button
              type="button"
              disabled={busy || s.photo.source === "default"}
              aria-pressed={s.photo.source === "default"}
              onClick={() => choose({ source: "default", ref: "" }, "Back to the department default. The preview below is updated.")}
              className="ap-btn ap-btn-s ap-btn-sm"
            >
              Use default
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              tabIndex={-1}
              aria-label="Upload your own job photo"
              className="sr-only"
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-2 text-[13px] text-(--ap-muted)">JPG, PNG or WebP up to 5 MB. A landscape photo about 1200 x 900 looks best.</p>
          {problem ? (
            <p role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">
              {problem}
            </p>
          ) : null}
          <p role="status" className={notice && !problem ? "mt-1.5 text-[13px] font-semibold text-(--ap-ok)" : "sr-only"}>
            {problem ? "" : notice}
          </p>

          <div data-ap-field className="mt-4 min-w-0">
            <label htmlFor={altId} className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">
              Photo description (alt text)<span className="text-(--ap-rose)"> *</span>
            </label>
            <input
              id={altId}
              className="ap-input"
              value={alt}
              maxLength={140}
              onChange={(e) => onAlt(e.target.value)}
              {...invalidAttrs(!!altError)}
              aria-describedby={`${altId}-hint${altError ? ` ${altId}-err` : ""}`}
            />
            <p id={`${altId}-hint`} className="mt-1 text-[13px] text-(--ap-muted)">
              Read aloud to people who cannot see the photo. Change it to say what is in the picture.
            </p>
            <FieldError id={`${altId}-err`}>{altError}</FieldError>
          </div>
        </div>
      </div>

      <LiveCardPreview s={s} config={config} existing={existing} loading={busy} />
    </Section>
  );
}

/** A VacancyDetail good enough for toApplicantJob, built from the unsaved form. Blank fields show a placeholder. */
function previewJob(s: FormState, config: VacancyConfig, existing: VacancyDetail | null) {
  const input = toInput(s);
  const client = config.clients.find((c) => c.id === s.clientId);
  const outlet = client?.outlets.find((o) => o.id === s.outletId);
  const detail: VacancyDetail = {
    ...input,
    id: existing?.id ?? "preview",
    reference: existing?.reference ?? "",
    client: { id: s.clientId, name: client?.name ?? "Client" },
    outlet: outlet ? { id: outlet.id, name: outlet.name } : null,
    recruiter: null,
    counts: existing ? existing.counts : { applications: 0, shortlisted: 0, interviewed: 0, placed: 0 },
    countsReady: existing?.countsReady,
    status: existing?.status ?? "published",
    postedAt: existing?.postedAt ?? null,
    endedAt: existing?.endedAt ?? null,
    allowedActions: [],
    canEdit: true,
    activity: [],
  };
  const job = toApplicantJob(detail);
  return {
    ...job,
    role: s.title.trim() || "Job title",
    location: s.location.trim() || "Location",
    employmentType: s.employmentType || "Employment type",
    department: (s.department || "Department") as ApplicantJob["department"],
    postedLabel: postedText(detail),
    closes: s.closesOn ? job.closes : "Closing date not set",
  };
}

function LiveCardPreview({ s, config, existing, loading }: { s: FormState; config: VacancyConfig; existing: VacancyDetail | null; loading: boolean }) {
  const job = previewJob(s, config, existing);
  return (
    <div className="mt-6 border-t border-(--ap-line) pt-5">
      <h3 className="text-[15px] font-bold">How applicants will see this card</h3>
      <p className="mt-1 mb-3 max-w-[70ch] text-[13px] leading-snug text-(--ap-muted)">
        Updates as you type. It shows the title, client and outlet, location, type, pay (only if the salary is public), the photo, and the Posted and Closes line. Nothing here can be clicked.
      </p>
      {loading ? (
        <div role="status" aria-label="Updating the preview" className="max-w-[760px]">
          <div className="ap-shimmer h-[200px] rounded-[18px]" />
        </div>
      ) : (
        <div className="max-w-[760px]" inert aria-hidden="true">
          <JobCard job={job} state={{ applied: false, draft: false }} />
        </div>
      )}
    </div>
  );
}
