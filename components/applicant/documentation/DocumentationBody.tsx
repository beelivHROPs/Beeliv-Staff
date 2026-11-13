"use client";

/**
 * Applicant Documentation form — /applicant/applications/[id]/documentation.
 *
 * The "thick step" of the confirmed workflow (BEELIV-APPLICANT-JOURNEY.md §4),
 * built frontend-only per project-lead approval (2026-09-29), de-duplicated
 * per docs/BEELIV-RECRUITMENT-SPEC.md §4 ("one field, one home"). Same wizard
 * shell as the Apply flow (components/applicant/ApplyBody.tsx): sticky step
 * rail on desktop, progress card on phones/tablets, slide-in steps, autosave
 * ("Saving…" → "Saved just now"), Save & exit, sticky footer.
 *
 * Persistence (lib/applicant/documentation.ts): Documentation-owned,
 * non-sensitive answers autosave per application to localStorage, so the
 * applicant resumes where they left off. Profile-owned values are read live
 * from the applicant store and never copied. 🔒 values (NIN, bank details,
 * physically-challenged status/detail, a new NIN copy) live ONLY in this
 * component's React state (`sensitive`) — per CLAUDE.md Stage 2C.
 *
 * Writes to the shared applicant store: only a passport photograph uploaded
 * here (via the existing uploadApplicationDocument(), so the photo keeps one
 * home in the profile documents). Submitting records `submittedAt` in the
 * documentation store only; it does not move the recruitment stage.
 */
import { setMaskedIds } from "@/lib/applicant/masked-ids";
import { maskId } from "@/lib/shared/mask";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, CloudUpload, FileCheck2, LockKeyhole } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { CompanyLogo } from "@/components/applicant/primitives";
import { useRelativeTime } from "@/components/applicant/RelativeTime";
import { BTN, CHIP, STROKE } from "@/components/applicant/apply/parts";
import { getApplication, getProfile, markDocumentationSubmitted, uploadApplicationDocument, useApplicantStore } from "@/lib/applicant/service";
import type { ApplicantDocument } from "@/lib/applicant/types";
import {
  DOCUMENTATION_SECTIONS,
  EMPTY_SENSITIVE,
  isValidNin,
  isValidNuban,
  currentJob,
  getDocumentationSync,
  getOrCreateDocumentationDraft,
  overallPercent,
  previousJob,
  profileFacts,
  saveDocumentationDraft,
  sectionProgress,
  signatureMatches,
  submitDocumentation,
  useDocumentationStore,
  type DocumentationDraft,
  type EmployerDetail,
  type NextOfKinSection,
  type PersonalSection,
  type ProfileJob,
  type SensitiveDetails,
} from "@/lib/applicant/documentation";
import { DOCUMENTATION_TERMS } from "@/lib/applicant/documentation-terms";
import { useFlagInvalid } from "@/components/applicant/form-feedback";
import { FOCUS } from "./controls";
import { DocumentsStep, EmploymentStep, NextOfKinStep, PersonalStep, SensitiveStep } from "./sections";
import { ReviewStep } from "./ReviewStep";
import { TermsStep } from "./TermsStep";
import { withPreloader } from "../Preloader";
import { BackCrumb, DOC_CARD, DocumentationNotFound, DocumentationNotOpen, DocumentationSkeleton, DocumentationSubmitted } from "./states";

const AUTOSAVE_MS = 700;
/** APPLICATION_STAGES index of "Documentation" (lib/applicant/types.ts). */
const DOCUMENTATION_STAGE = 3;
const TOTAL = DOCUMENTATION_SECTIONS.length;
const REVIEW_STEP = DOCUMENTATION_SECTIONS.findIndex((s) => s.key === "review");
const TERMS_STEP = DOCUMENTATION_SECTIONS.findIndex((s) => s.key === "terms");
const PHOTO_DOC_NAME = "Passport photograph";

type Init = { kind: "loading" } | { kind: "notfound" } | { kind: "notopen" } | { kind: "ready" } | { kind: "submitted"; justNow: boolean };

/* ------------------------------------------------------------ helpers */

function usableFile(doc: ApplicantDocument | undefined): string | null {
  return doc && doc.fileName && doc.status !== "action-required" ? doc.fileName : null;
}

/** Existing passport photograph on the applicant's record (most recent first). */
function findExistingPhoto(docs: ApplicantDocument[]): string | null {
  return usableFile([...docs].reverse().find((d) => d.docType === "passport-photo" || d.name === PHOTO_DOC_NAME));
}

/** Existing Valid ID that is a NIN slip (RECRUITMENT-SPEC §5) — not any other ID type. */
function findExistingNinCopy(docs: ApplicantDocument[]): string | null {
  return usableFile(
    docs.find(
      (d) =>
        (d.docType === "valid-id" || d.name === "Valid ID" || d.name === "NIN slip") &&
        /\bnin\b|nin[_\s-]?slip/i.test([d.name, d.description ?? "", d.fileName ?? ""].join(" ")),
    ),
  );
}

/** Re-point an employer detail at the profile entry it belongs to; start fresh if the entry changed. */
function alignDetail<T extends EmployerDetail>(d: T, job: ProfileJob | null): T {
  if (!job) return d;
  if (d.entryKey === job.key) return d;
  if (!d.entryKey) return { ...d, entryKey: job.key, location: d.location || job.location };
  return { ...d, entryKey: job.key, location: job.location, contact: "", description: "", manager: "" };
}

function hasAnySensitive(s: SensitiveDetails) {
  return Object.values(s).some((v) => typeof v === "string" && v.trim() !== "");
}

/* ---------------------------------------------------------------- body */

export function DocumentationBody({ applicationId }: { applicationId: string }) {
  // First hooks: their effects hydrate both stores before the init effect below runs.
  const store = useApplicantStore();
  useDocumentationStore();
  const router = useRouter();

  const [init, setInit] = useState<Init>({ kind: "loading" });
  const [draft, setDraft] = useState<DocumentationDraft | null>(null);
  /** MEMORY ONLY (🔒) — never persisted. */
  const [sensitive, setSensitive] = useState<SensitiveDetails>(EMPTY_SENSITIVE);
  // Only the MASKED text ("1234*******") is remembered, for the review step and the Staff profile; the full numbers stay in memory above.
  const typedBefore = useRef({ nin: false, account: false });
  useEffect(() => {
    // Leave the stored masked text alone until a number is actually typed (or typed and then cleared).
    const patch: { nin?: string; account?: string } = {};
    if (sensitive.nin || typedBefore.current.nin) patch.nin = isValidNin(sensitive.nin) ? maskId(sensitive.nin) : "";
    if (sensitive.bankAccountNumber || typedBefore.current.account) patch.account = isValidNuban(sensitive.bankAccountNumber) ? maskId(sensitive.bankAccountNumber) : "";
    typedBefore.current = { nin: !!sensitive.nin, account: !!sensitive.bankAccountNumber };
    if (patch.nin !== undefined || patch.account !== undefined) setMaskedIds(patch);
  }, [sensitive.nin, sensitive.bankAccountNumber]);
  /** Passport photo uploaded during this visit (display only; the record lives in the profile documents). */
  const [sessionPhoto, setSessionPhoto] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  // Set by a Submit press with terms/signature missing: the Terms step then flags them.
  const [tried, setTried] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const flag = useFlagInvalid(mainRef);
  const [savedAt, setSavedAt] = useState<string>(() => new Date().toISOString());
  const [today] = useState(() => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));

  const latest = useRef<DocumentationDraft | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (startedFor.current === applicationId) return;
    startedFor.current = applicationId;
    (async () => {
      const [app, profile] = await Promise.all([getApplication(applicationId), getProfile()]);
      if (!app) return setInit({ kind: "notfound" });
      if (app.lifecycle === "draft" || app.stage < DOCUMENTATION_STAGE) return setInit({ kind: "notopen" });
      const existing = getDocumentationSync(applicationId);
      if (existing?.submittedAt) {
        setDraft(existing);
        return setInit({ kind: "submitted", justNow: false });
      }
      const cur = currentJob(profile);
      const prev = previousJob(profile);
      const { draft: created, resumed } = getOrCreateDocumentationDraft(applicationId, {
        current: cur ? { entryKey: cur.key, location: cur.location } : {},
        previous: prev ? { entryKey: prev.key, location: prev.location } : {},
      });
      const d = { ...created, current: alignDetail(created.current, cur), previous: alignDetail(created.previous, prev) };
      latest.current = d;
      setDraft(d);
      setStep(Math.min(Math.max(0, d.step), TOTAL - 1));
      setSavedAt(d.updatedAt);
      setInit({ kind: "ready" });
      toast.add({ title: resumed ? "Resuming your documentation where you left off" : "Your profile details are already filled in" });
    })();
  }, [applicationId]);

  // Flush a pending autosave if the applicant navigates away mid-debounce.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (dirty.current && latest.current) saveDocumentationDraft(latest.current);
    },
    [],
  );

  const savedLabel = useRelativeTime(savedAt);

  function flush(atStep: number) {
    window.clearTimeout(timer.current);
    const d = latest.current;
    if (!d) return;
    const next = { ...d, step: atStep };
    latest.current = next;
    saveDocumentationDraft(next);
    dirty.current = false;
    setSaving(false);
    setSavedAt(new Date().toISOString());
  }

  function update(mut: (d: DocumentationDraft) => DocumentationDraft) {
    const base = latest.current;
    if (!base) return;
    const next = mut(base);
    latest.current = next;
    dirty.current = true;
    setDraft(next);
    setSaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flush(step), AUTOSAVE_MS);
  }

  const setPersonal = <K extends keyof PersonalSection>(k: K, v: PersonalSection[K]) => update((d) => ({ ...d, personal: { ...d.personal, [k]: v } }));
  const setCurrentDetail = <K extends keyof EmployerDetail>(k: K, v: EmployerDetail[K]) => update((d) => ({ ...d, current: { ...d.current, [k]: v } }));
  const setPreviousDetail = <K extends keyof EmployerDetail>(k: K, v: EmployerDetail[K]) => update((d) => ({ ...d, previous: { ...d.previous, [k]: v } }));
  const setNextOfKin = <K extends keyof NextOfKinSection>(k: K, v: NextOfKinSection[K]) => update((d) => ({ ...d, nextOfKin: { ...d.nextOfKin, [k]: v } }));
  const setSens = <K extends keyof SensitiveDetails>(k: K, v: SensitiveDetails[K]) => setSensitive((s) => ({ ...s, [k]: v }));

  function goTo(next: number) {
    flush(next);
    setDir(next >= step ? 1 : -1);
    setStep(next);
    window.scrollTo(0, 0);
  }

  /** Leave the form (Save & exit, or to update the profile) — warns first if 🔒 details would be lost. */
  async function leave(href: string, toastTitle?: string) {
    if (hasAnySensitive(sensitive)) {
      const ok = await confirmAction({
        tone: "caution",
        icon: LockKeyhole,
        title: "Leave without your sensitive details?",
        description: "Your NIN, bank details and physical-challenge answer aren't saved in this preview, so you'll need to add them again. Everything else is saved.",
        confirmLabel: "Save & leave",
        cancelLabel: "Stay here",
      });
      if (!ok) return;
    }
    flush(step);
    setSensitive(EMPTY_SENSITIVE);
    if (toastTitle) toast.add({ title: toastTitle });
    router.push(href);
  }

  function onPhoto(fileName: string) {
    // One home: the photo is a profile document (RECRUITMENT-SPEC §5), reused here and on every application.
    void uploadApplicationDocument({ name: PHOTO_DOC_NAME, fileName, applicationId });
    setSessionPhoto(fileName);
  }

  /* ----------------------------------------------------------- render */

  const app = store.applications.find((a) => a.id === applicationId);

  if (init.kind === "loading") return <DocumentationSkeleton />;
  if (init.kind === "notfound" || !app) return <DocumentationNotFound />;
  if (init.kind === "notopen") return <DocumentationNotOpen applicationId={applicationId} role={app.role} company={app.company} />;
  if (init.kind === "submitted" || !draft) {
    const at = draft?.submittedAt ? new Date(draft.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
    return <DocumentationSubmitted applicationId={applicationId} role={app.role} company={app.company} submittedLabel={at} justNow={init.kind === "submitted" && init.justNow} />;
  }

  const profile = store.profile;
  const facts = profileFacts(profile);
  const jobs = { current: currentJob(profile), previous: previousJob(profile) };
  const emergency = {
    name: profile.emergencyContact?.name ?? "",
    relationship: profile.emergencyContact?.relationship ?? "",
    phone: profile.emergencyContact?.phone ?? "",
  };
  const existingPhoto = findExistingPhoto(store.documents);
  const existingNin = findExistingNinCopy(store.documents);
  const progress = sectionProgress(draft, sensitive, {
    facts,
    hasCurrentJob: !!jobs.current,
    hasPreviousJob: !!jobs.previous,
    emergency,
    passportPhoto: !!(existingPhoto || sessionPhoto),
    ninCopy: !!existingNin,
  });
  const percent = overallPercent(progress);
  const section = DOCUMENTATION_SECTIONS[step];
  const isLast = step === TERMS_STEP;
  const allTerms = draft.terms.length === DOCUMENTATION_TERMS.length && draft.terms.every(Boolean);
  const signed = signatureMatches(draft.signature, facts.fullName);
  const canSubmit = allTerms && signed;
  const savedText = saving ? "Saving…" : `Saved ${savedLabel.charAt(0).toLowerCase()}${savedLabel.slice(1)}`;
  const photoLabel = sessionPhoto ? `Uploaded · ${sessionPhoto}` : existingPhoto ? `From your profile · ${existingPhoto}` : "Not added yet";
  const ninFile = sensitive.ninCopyFileName;
  const ninCopyLabel = ninFile ? `Uploaded · ${ninFile}` : existingNin ? `NIN slip on your profile · ${existingNin}` : "Not added yet";
  const incomplete = DOCUMENTATION_SECTIONS.slice(0, REVIEW_STEP).filter((s) => !progress[s.key].complete);
  const editProfile = () => void leave("/applicant/profile");

  function onSameAsEmergency(on: boolean) {
    update((d) =>
      on
        ? { ...d, nextOfKin: { ...d.nextOfKin, sameAsEmergency: true } }
        : // Turning it off keeps the values as an editable starting point.
          { ...d, nextOfKin: { ...d.nextOfKin, sameAsEmergency: false, name: emergency.name, relationship: emergency.relationship, phone: emergency.phone } },
    );
  }

  async function onSubmit() {
    if (!latest.current) return;
    if (!canSubmit) {
      setTried(true);
      flag();
      return;
    }
    flush(step);
    const points = [
      `All ${DOCUMENTATION_TERMS.length} terms accepted and signed as ${facts.fullName} on ${today}.`,
      ...(incomplete.length ? [`Still incomplete: ${incomplete.map((s) => s.label).join(", ")}.`] : []),
      "Your NIN, bank details and physical-challenge answer aren't saved or sent in this preview.",
    ];
    const ok = await confirmAction({
      tone: "neutral",
      icon: FileCheck2,
      title: "Submit your documentation?",
      description: "Beeliv will verify what you've provided.",
      points,
      confirmLabel: "Submit documentation",
      cancelLabel: "Keep editing",
    });
    if (!ok || !latest.current) return;
    const current = latest.current;
    const done = await withPreloader("submit-documentation", {}, () => submitDocumentation(current));
    void markDocumentationSubmitted(applicationId);
    latest.current = done;
    dirty.current = false;
    setDraft(done);
    setSensitive(EMPTY_SENSITIVE);
    setInit({ kind: "submitted", justNow: true });
    window.scrollTo(0, 0);
  }

  const saved = (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-(--ap-muted)" aria-live="polite">
      <CloudUpload className="size-[15px] shrink-0 text-(--ap-ok)" strokeWidth={STROKE} aria-hidden="true" />
      <span>{savedText}</span>
    </span>
  );

  return (
    <div>
      <BackCrumb href={`/applicant/applications/${applicationId}`} label="Application progress" />

      {/* `.mstep` — phones & tablets (≤1040px) */}
      <div className={`${DOC_CARD} mb-4 px-4 py-3.5 min-[1041px]:hidden`}>
        <div className="flex items-baseline justify-between gap-3">
          <b className="text-[14px]">
            Step {step + 1} of {TOTAL}
          </b>
          {saved}
        </div>
        <div className="ap-bar mt-2.5" role="progressbar" aria-label="Documentation completeness" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <i className="transition-[width] duration-700" style={{ width: `${Math.max(percent, 4)}%` }} />
        </div>
        <div className="mt-2 flex justify-between gap-3 text-[13px] text-(--ap-muted)">
          <span className="min-w-0 truncate">{percent}% complete</span>
          <span className="shrink-0 text-right">Next: {DOCUMENTATION_SECTIONS[step + 1]?.label ?? "Submit"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 min-[1041px]:grid-cols-[260px_minmax(0,1fr)]">
        {/* `.wk-side` */}
        <aside className={`${DOC_CARD} sticky top-[88px] hidden p-6 min-[1041px]:block`} aria-label="Documentation sections">
          <div className="mb-2.5 flex items-center gap-3 border-b border-(--ap-line-2) pb-4">
            <CompanyLogo name={app.company} size={46} />
            <div className="min-w-0">
              <b className="block text-[15px]">{app.role}</b>
              <span className="text-[13px] text-(--ap-muted)">{app.company} · Documentation</span>
            </div>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {DOCUMENTATION_SECTIONS.map((s, i) => {
              const pr = progress[s.key];
              const current = i === step;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={current ? "step" : undefined}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] border-0 px-2.5 py-2 text-left text-[14px] ${FOCUS} ${
                      current
                        ? "bg-(--ap-tint) font-bold text-(--ap-violet)"
                        : pr.complete
                          ? "font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)"
                          : "font-semibold text-(--ap-muted) hover:bg-(--ap-line-2)"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-bold ${
                        pr.complete ? "border-(--ap-violet) bg-(--ap-violet) text-white" : current ? "border-(--ap-violet) bg-white text-(--ap-violet)" : "border-[#cfc8d8] bg-white"
                      }`}
                    >
                      {pr.complete ? <Check className="size-3.5" strokeWidth={STROKE} aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block">{s.label}</span>
                      {!pr.complete && s.key !== "review" && i < step ? (
                        <span className="block text-[12px] font-semibold text-(--ap-warn)">{pr.total - pr.done} left</span>
                      ) : null}
                    </span>
                    {pr.complete ? <span className="sr-only"> (complete)</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="ap-bar mt-4" role="progressbar" aria-label="Documentation completeness" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <i className="transition-[width] duration-700" style={{ width: `${Math.max(percent, 4)}%` }} />
          </div>
          <div className="mt-2 text-[13px] font-semibold text-(--ap-ink-2)">{percent}% complete</div>
          <div className="mt-2">{saved}</div>
        </aside>

        {/* `.wk-main` */}
        <section ref={mainRef} className={`${DOC_CARD} p-6 min-[768px]:max-[1100px]:p-[22px] max-[767px]:px-4.5 max-[767px]:py-5`} aria-labelledby="dc-step-title">
          <div className="mb-2.5 flex flex-wrap gap-2">
            <span className={CHIP.mute}>Documentation</span>
            {section.key === "sensitive" ? (
              <span className={CHIP.info}>
                <LockKeyhole className="size-3.5" strokeWidth={STROKE} aria-hidden="true" />
                Not saved in this preview
              </span>
            ) : null}
          </div>
          <h1 id="dc-step-title" className="ap-serif text-[35px] max-[767px]:text-[30px]">
            {section.label}
          </h1>
          <p className="ap-bd mt-1.5 mb-5.5">{section.description}</p>

          <div key={step} className={dir > 0 ? "ap-step-fwd" : "ap-step-back"}>
            {section.key === "personal" && (
              <PersonalStep
                facts={facts}
                personal={draft.personal}
                set={setPersonal}
                sensitive={sensitive}
                setSensitive={setSens}
                existingPhoto={existingPhoto}
                sessionPhoto={sessionPhoto}
                onPhoto={onPhoto}
                onEditProfile={editProfile}
              />
            )}
            {section.key === "current" && (
              <EmploymentStep
                variant="current"
                job={jobs.current}
                detail={draft.current}
                setDetail={setCurrentDetail}
                off={draft.current.notEmployed}
                setOff={(v) => update((d) => ({ ...d, current: { ...d.current, notEmployed: v } }))}
                onEditProfile={editProfile}
              />
            )}
            {section.key === "previous" && (
              <EmploymentStep
                variant="previous"
                job={jobs.previous}
                detail={draft.previous}
                setDetail={setPreviousDetail}
                off={draft.previous.none}
                setOff={(v) => update((d) => ({ ...d, previous: { ...d.previous, none: v } }))}
                onEditProfile={editProfile}
              />
            )}
            {section.key === "nextOfKin" && <NextOfKinStep value={draft.nextOfKin} set={setNextOfKin} emergency={emergency} onSameAsEmergency={onSameAsEmergency} />}
            {section.key === "sensitive" && <SensitiveStep value={sensitive} set={setSens} profileName={facts.fullName} />}
            {section.key === "documents" && (
              <DocumentsStep
                existingNinCopy={existingNin}
                ninCopyFileName={ninFile}
                onNinCopy={(name) => setSens("ninCopyFileName", name)}
                existingPhoto={existingPhoto}
                sessionPhoto={sessionPhoto}
                onPhoto={onPhoto}
              />
            )}
            {section.key === "review" && (
              <ReviewStep
                draft={draft}
                sensitive={sensitive}
                facts={facts}
                jobs={jobs}
                emergency={emergency}
                progress={progress}
                photoLabel={photoLabel}
                ninCopyLabel={ninCopyLabel}
                onEdit={goTo}
              />
            )}
            {section.key === "terms" && (
              <TermsStep
                terms={draft.terms}
                onToggle={(i) => update((d) => ({ ...d, terms: d.terms.map((t, j) => (j === i ? !t : t)) }))}
                signature={draft.signature}
                onSignature={(v) => update((d) => ({ ...d, signature: v }))}
                fullName={facts.fullName}
                today={today}
                showErrors={tried}
              />
            )}
          </div>

          {isLast && !canSubmit ? (
            <p id="dc-submit-hint" className="mt-5 text-[13px] text-(--ap-muted)">
              {!allTerms ? "Tick all six terms and sign with your full name to submit." : "Sign with your full name to submit."}
            </p>
          ) : null}
          {/* Phones: the footer hides Save & exit (same as Apply), so offer it here. */}
          <div className="mt-5 flex justify-end min-[768px]:hidden">
            <button
              type="button"
              onClick={() => void leave(`/applicant/applications/${applicationId}`, "Documentation saved. Continue any time from your application.")}
              className={`min-h-11 text-[14px] font-bold text-(--ap-violet) ${FOCUS}`}
            >
              Save &amp; exit
            </button>
          </div>

          {/* `.wk-foot` — pinned to the bottom edge on phones (no bottom nav on this flow) */}
          <div className="mt-6.5 flex items-center gap-2.5 border-t border-(--ap-line-2) pt-4.5 max-[767px]:fixed max-[767px]:inset-x-0 max-[767px]:bottom-0 max-[767px]:z-[40] max-[767px]:mt-5.5 max-[767px]:bg-white max-[767px]:px-4 max-[767px]:pt-3 max-[767px]:pb-[calc(12px+env(safe-area-inset-bottom,0px))] max-[767px]:shadow-[0_-8px_24px_rgba(17,17,27,.08)] max-[640px]:grid max-[640px]:grid-cols-[auto_minmax(0,1fr)]">
            {step > 0 ? (
              <button type="button" onClick={() => goTo(step - 1)} className={`${BTN} ap-btn-s max-[767px]:h-12 max-[640px]:min-w-0 max-[640px]:px-3.5 ${FOCUS}`}>
                <ChevronLeft className="size-4" strokeWidth={STROKE} aria-hidden="true" />
                Back
              </button>
            ) : null}
            <span className="flex-1 max-[767px]:hidden" />
            <button
              type="button"
              onClick={() => void leave(`/applicant/applications/${applicationId}`, "Documentation saved. Continue any time from your application.")}
              className={`${BTN} bg-[#f1eff3] text-(--ap-ink) hover:bg-[#e8e4ed] max-[767px]:hidden ${FOCUS}`}
            >
              Save &amp; exit
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={() => void onSubmit()}
                aria-describedby={!canSubmit ? "dc-submit-hint" : undefined}
                className={`${BTN} ap-btn-p max-[767px]:h-12 max-[767px]:flex-1 max-[640px]:min-w-0 ${FOCUS}`}
              >
                <span className="max-[767px]:hidden">Submit documentation</span>
                <span className="min-[768px]:hidden">Submit</span>
                <ArrowRight className="size-4" strokeWidth={STROKE} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className={`${BTN} ap-btn-p max-[767px]:h-12 max-[767px]:flex-1 max-[640px]:min-w-0 ${step === 0 ? "max-[640px]:col-span-full" : ""} ${FOCUS}`}
              >
                {step === REVIEW_STEP ? "Continue to terms" : "Continue"}
                <ArrowRight className="size-4" strokeWidth={STROKE} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
