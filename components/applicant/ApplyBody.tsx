"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, CircleAlert, CloudUpload } from "@/components/applicant/icons";
import type { ApplicantJob as Job } from "@/lib/applicant/jobs";
import { toast } from "@/components/ui/toast";
import { APPLY_STEPS, APPLY_STEP_DESCRIPTIONS } from "@/lib/applicant/reference-data";
import {
  attachExistingDocument,
  getDraftForVacancy,
  getOrCreateDraft,
  getProfile,
  listApplications,
  saveApplicationStep,
  saveProfile,
  submitApplication,
  useApplicantStore,
} from "@/lib/applicant/service";
import { readScreeningAnswers } from "@/lib/applicant/screening";
import { questionsForJob } from "@/lib/journeys/applicant";
import type { ApplyFormData } from "@/lib/applicant/types";
import { JobThumb } from "./primitives";
import { useFlagInvalid } from "./form-feedback";
import { useRelativeTime } from "./RelativeTime";
import { BTN, LINK_CLS, STROKE } from "./apply/parts";
import { StepPersonal, type PersonalProfileFields } from "./apply/StepPersonal";
import { StepExperience } from "./apply/StepExperience";
import { StepSkills } from "./apply/StepSkills";
import { REUSABLE_DOCS, StepDocuments, findReusableDoc } from "./apply/StepDocuments";
import { applicationSubmitAvailable } from "@/lib/applicant/uploads/runtime";
import { useUploadSlotStates } from "@/lib/applicant/uploads/use-upload-slot";
import type { UploadSlot } from "@/lib/applicant/uploads/types";
import { StepScreening } from "./apply/StepScreening";
import { StepTest, useApplyTest } from "./apply/StepTest";
import { submitAttempt } from "@/lib/forms/participant-store";
import { StepReview, joinAnd, missingRequired } from "./apply/StepReview";
import { ApplyBlocked, ApplySuccess } from "./apply/ApplyStates";
import { withPreloader } from "./Preloader";
import { BackHeader } from "@/components/shared/mobile/BackHeader";
import { StickyActionBar } from "@/components/shared/mobile/StickyActionBar";

/**
 * Apply workspace — the wireframe's applyPage() (beeliv-website/applicant/
 * index.html): desktop `.wk` grid (260px sticky `.wk-side` stepper + `.wk-main`),
 * `.mstep` progress card at ≤1040px, sticky `.wk-foot`.
 *
 * Front-loaded per direct project-lead instruction (2026-09-28): employment
 * history, CV/photo/ID-file/cert uploads and screening questions are all
 * captured in the initial Draft Application. Guarantor, references and
 * medical documents are NOT asked here — they are later pre-employment
 * documents. No NIN number or banking field exists anywhere in this flow.
 *
 * All reads/writes go through lib/applicant/service.ts (mock adapter).
 */

/** Wireframe savedPing(): "Saving…" for 700ms after the last change, then "Saved just now". */
const AUTOSAVE_MS = 700;

const CARD = "ax-box";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";

/** ApplyFormData keys that are also profile fields ("Changes here also update your profile"). */
const PROFILE_FORM_KEYS = ["fullName", "preferredName", "phone", "whatsapp", "email"] as const;

type Init =
  | { kind: "loading" }
  | { kind: "blocked"; reason: "closed" | "applied"; applicationId?: string }
  | { kind: "ready"; applicationId: string };

function locationFrom(address: string, state: string): string {
  const area = address.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  return [area, state].filter(Boolean).join(", ");
}

export function ApplyBody({ job }: { job: Job }) {
  // Must be the first hook: its effect hydrates the mock store from
  // localStorage, and effects run in declaration order, so the draft
  // lookup below always sees hydrated data.
  const store = useApplicantStore();
  const router = useRouter();

  const [init, setInit] = useState<Init>({ kind: "loading" });
  const [step, setStep] = useState(0);
  // Direction of the last step change, for the slide-in (1 = Next, -1 = Back).
  const [dir, setDir] = useState<1 | -1>(1);
  const [form, setForm] = useState<ApplyFormData | null>(null);
  const [personal, setPersonalState] = useState<PersonalProfileFields | null>(null);
  const [ack, setAck] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Set by a Submit press with something missing: fields then show what is wrong.
  const [tried, setTried] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [savedAt, setSavedAt] = useState<string>(() => new Date().toISOString());
  // This vacancy's own screening questions (lib/applicant/screening.ts).
  const questions = useMemo(() => questionsForJob(job), [job]);
  // The test this vacancy carries (if any): taken inside the Screening step and sent with the application.
  const test = useApplyTest(job.testFormId, `${store.profile.id}:apply-${job.id}`);

  const startedFor = useRef<string | null>(null);
  const pending = useRef<{ form: ApplyFormData | null; personal: PersonalProfileFields | null; profileDirty: boolean }>({
    form: null,
    personal: null,
    profileDirty: false,
  });
  const timer = useRef<number | undefined>(undefined);

  // Draft continuity: resolves the SAME draft for this vacancy if one exists
  // (never a duplicate). The ref guard keeps React StrictMode's dev-only
  // double effect from firing the toast twice.
  useEffect(() => {
    if (startedFor.current === job.id) return;
    startedFor.current = job.id;
    (async () => {
      const [apps, profile] = await Promise.all([listApplications(), getProfile()]);
      const existing = getDraftForVacancy(job.id);
      const submittedApp = apps.find((a) => a.vacancyId === job.id && a.lifecycle !== "draft");
      if (submittedApp) {
        setInit({ kind: "blocked", reason: "applied", applicationId: submittedApp.id });
        return;
      }
      if (job.closed) {
        setInit({ kind: "blocked", reason: "closed" });
        return;
      }
      const draft = await getOrCreateDraft(job.id, {
        role: job.role,
        company: job.company,
        location: job.location,
        employmentType: job.employmentType,
      });
      setForm(draft.form);
      setPersonalState({
        applicantId: profile.applicantId,
        dateOfBirth: profile.dateOfBirth,
        address: profile.address,
        state: profile.state,
        lga: profile.lga,
      });
      // Wireframe: a resumed draft opens at step 2 (index 1); a new one at step 1.
      setStep(existing ? 1 : 0);
      setSavedAt(draft.updatedAt);
      setInit({ kind: "ready", applicationId: draft.id });
      toast.add({
        title: existing ? "Resuming your saved application" : `Draft started for ${job.role}. Your profile details are already filled in.`,
      });
    })();
  }, [job]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Every step (including the first one, once the draft has loaded) starts at
  // the top of the page. Without this, phones kept the scroll position from
  // the job page when the Personal details step appeared (project lead).
  const ready = init.kind === "ready";
  useEffect(() => {
    if (ready) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [ready, step]);

  const flag = useFlagInvalid(mainRef);

  const applicationId = init.kind === "ready" ? init.applicationId : null;
  const savedLabel = useRelativeTime(savedAt);

  async function flush(atStep: number = step) {
    window.clearTimeout(timer.current);
    const p = pending.current;
    pending.current = { form: null, personal: null, profileDirty: false };
    if (!applicationId) return;
    const f = p.form ?? form;
    if (f) await saveApplicationStep(applicationId, atStep, f);
    if (p.profileDirty && f) {
      const per = p.personal ?? personal;
      await saveProfile({
        fullName: f.fullName,
        preferredName: f.preferredName,
        phone: f.phone,
        whatsapp: f.whatsapp,
        email: f.email,
        ...(per ? { dateOfBirth: per.dateOfBirth, address: per.address, state: per.state, lga: per.lga } : {}),
      });
    }
    setSaving(false);
    setSavedAt(new Date().toISOString());
  }

  function scheduleSave() {
    setSaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
  }

  function updateForm(next: ApplyFormData, touchesProfile = false) {
    setForm(next);
    pending.current.form = next;
    if (touchesProfile) pending.current.profileDirty = true;
    scheduleSave();
  }

  function set<K extends keyof ApplyFormData>(key: K, value: ApplyFormData[K]) {
    if (!form) return;
    updateForm({ ...form, [key]: value }, (PROFILE_FORM_KEYS as readonly string[]).includes(key));
  }

  function setPersonal<K extends keyof PersonalProfileFields>(key: K, value: PersonalProfileFields[K]) {
    if (!personal) return;
    // Build on the latest pending value, not the render's `personal`: picking a state calls this twice in a row
    // (state, then clearing a mismatched LGA) and the second call must not undo the first.
    const next = { ...(pending.current.personal ?? personal), [key]: value };
    setPersonalState(next);
    pending.current.personal = next;
    pending.current.profileDirty = true;
    scheduleSave();
  }

  function setScreeningAnswer(id: string, value: string | string[]) {
    if (!form) return;
    updateForm({ ...form, screeningAnswers: { ...readScreeningAnswers(form, questions), [id]: value } });
  }

  function toggleSector(s: string) {
    if (!form) return;
    updateForm({ ...form, sectors: form.sectors.includes(s) ? form.sectors.filter((x) => x !== s) : [...form.sectors, s] });
  }

  function toggleSkill(category: string, skill: string) {
    if (!form) return;
    const current = form.skills[category] ?? [];
    const next = current.includes(skill) ? current.filter((x) => x !== skill) : [...current, skill];
    updateForm({ ...form, skills: { ...form.skills, [category]: next } });
  }

  async function goTo(next: number) {
    await flush(step);
    setDir(next >= step ? 1 : -1);
    setStep(next);
  }

  async function saveAndExit() {
    await flush(step);
    toast.add({ title: "Draft saved. Continue any time from My Applications." });
    router.push("/applicant/applications");
  }

  const reusable = REUSABLE_DOCS.map((d) => ({ ...d, doc: findReusableDoc(store.documents, d.name) })).filter((d) => d.doc);
  // BEELIV-RECRUITMENT-SPEC §5: CV, passport photograph and valid ID are
  // "Required to apply" (only these three; everything else stays optional).
  // A file that is on its way or already sent for checking is not "missing", but it is not accepted
  // evidence either: the final submit stays closed (see applicationSubmitAvailable) until the server can say so.
  const uploads = useUploadSlotStates();
  const sentOrBusy = (slot: UploadSlot) => ["validating", "requesting", "uploading", "finishing", "checking", "in-review"].includes(uploads[slot].kind);
  const missingDocs = REUSABLE_DOCS.filter((d) => !reusable.some((r) => r.name === d.name) && !sentOrBusy(d.docType as UploadSlot));
  const submitClosed = !applicationSubmitAvailable();

  /** Continue: stay put and flag any field that already shows itself as invalid (e.g. a wrong phone number). */
  function onContinue() {
    if (mainRef.current?.querySelector('[aria-invalid="true"]')) {
      flag();
      return;
    }
    void goTo(step + 1);
  }

  /** From a warning line: jump to the step that holds the problem, then flag it there. */
  async function fixAt(target: number) {
    setTried(true);
    await goTo(target);
    flag();
  }

  async function onSubmit() {
    if (!applicationId || !form) return;
    // Truthful gate: no submit (and no success screen) until server-backed evidence and atomic submission exist.
    if (!applicationSubmitAvailable()) return;
    if (!ack || missingDocs.length > 0 || missingRequired(form, questions).length > 0 || test.missing.length > 0) {
      setTried(true);
      flag();
      return;
    }
    // One submit: the test attempt goes first (tagged with this application), then the application itself.
    if (test.form) {
      try {
        const sent = await submitAttempt({
          formId: test.form.id,
          formVersion: test.form.version,
          takerId: store.profile.id,
          takerName: store.profile.fullName,
          takerType: "applicant",
          applicationId,
          vacancyId: job.id,
          startedAt: test.draft.startedAt ?? new Date().toISOString(),
          answers: test.answers,
          otherText: test.otherText,
        });
        test.update({ submittedAt: new Date().toISOString(), submissionId: sent.id });
      } catch {
        toast.add({ title: "We couldn't send your test answers", description: "They are saved on this device. Try submitting again." });
        return;
      }
    }
    await withPreloader("submit-application", { role: job.role, company: job.company }, async () => {
      await flush(step);
      // "Use existing ✓": the stored CV / photo / ID file are attached to this
      // application rather than re-uploaded.
      for (const d of reusable) if (d.doc) await attachExistingDocument(d.doc.id, applicationId);
      await submitApplication(applicationId);
    });
    setSubmitted(true);
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------------- render */

  if (submitted && applicationId) return <ApplySuccess job={job} applicationId={applicationId} />;
  if (init.kind === "blocked") return <ApplyBlocked job={job} reason={init.reason} applicationId={init.applicationId} />;
  if (init.kind === "loading" || !form || !personal || !applicationId) return <ApplySkeleton />;

  const total = APPLY_STEPS.length;
  const isLast = step === total - 1;
  const missing = missingRequired(form, questions);
  const canSubmit = !submitClosed && ack && missing.length === 0 && missingDocs.length === 0 && test.missing.length === 0;
  const missingDocsLabel = joinWords(missingDocs.map((d) => d.short));
  const sidePct = Math.max(Math.round((step / total) * 100), 8);
  const stepPct = Math.round(((step + 1) / total) * 100);
  const savedText = saving ? "Saving…" : `Saved ${savedLabel.charAt(0).toLowerCase()}${savedLabel.slice(1)}`;
  const description = step === 4 ? `${job.company} asked these questions for this role.` : APPLY_STEP_DESCRIPTIONS[step];
  const reusedLabel = reusable.map((d) => d.short).join(", ");

  const saved = (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-(--ap-muted)" aria-live="polite">
      <CloudUpload className="size-[15px] shrink-0 text-(--ax-olive)" strokeWidth={STROKE} aria-hidden="true" />
      <span>{savedText}</span>
    </span>
  );

  const warn = "mt-5 flex items-start gap-2 rounded-xl bg-(--ap-warn-bg) px-3.5 py-3 text-[14px] leading-snug text-(--ap-warn)";
  // What is still missing, in plain words, shown above the sticky Submit on phones.
  const submitHint = isLast && submitClosed ? "Sending isn't open yet. Your draft is saved." : isLast && !canSubmit ? (missingDocs.length ? `Upload your ${missingDocsLabel} to submit.` : missing.length ? "Answer the required screening questions to submit." : test.missing.length ? "Answer every test question to submit." : "Tick the confirmation to submit.") : undefined;

  return (
    <div className="ax-root">
      {/* Phone: back arrow + step title, thin progress bar, and the save state */}
      <BackHeader
        className="-mx-[18px] -mt-1.5 max-[380px]:-mx-3.5"
        title={APPLY_STEPS[step]}
        titleAs="h1"
        backLabel={step > 0 ? "Back to the previous step" : "Back to the job"}
        onBack={() => (step > 0 ? void goTo(step - 1) : router.push(`/applicant/jobs/${job.id}`))}
        right={
          <button type="button" onClick={() => void saveAndExit()} className="ax-link min-h-11 px-2 no-underline">
            Save &amp; exit
          </button>
        }
      >
        <div className="ap-bar !h-[3px] !rounded-none" role="progressbar" aria-label="Application progress" aria-valuenow={stepPct} aria-valuemin={0} aria-valuemax={100}>
          <i className="!rounded-none transition-[width] duration-500" style={{ width: `${stepPct}%` }} />
        </div>
      </BackHeader>
      <div className="flex items-center justify-between gap-3 pt-3 text-[13px] text-(--ap-muted) min-[768px]:hidden">
        <span className="whitespace-nowrap">
          Step {step + 1} of {total}
        </span>
        {saved}
      </div>

      {/* Desktop / tablet: crumb */}
      <Link href={`/applicant/jobs/${job.id}`} className={`ax-link mt-1 mb-3 hidden min-h-9 items-center gap-1 no-underline max-[767px]:hidden min-[768px]:inline-flex ${FOCUS}`}>
        <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
        {job.role}
      </Link>

      {/* Tablet strip (768 to 1040): step count + thin bar, no card */}
      <div className="mb-4 hidden min-[768px]:block min-[1041px]:hidden">
        <div className="flex items-baseline justify-between gap-3 text-[14px]">
          <b>
            Step {step + 1} of {total}
          </b>
          {saved}
        </div>
        <div className="ap-bar mt-2" role="progressbar" aria-label="Application progress" aria-valuenow={stepPct} aria-valuemin={0} aria-valuemax={100}>
          <i className="transition-[width] duration-500" style={{ width: `${stepPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[1041px]:grid-cols-[250px_minmax(0,1fr)]">
        {/* Desktop stepper */}
        <aside className="ax-box sticky top-[88px] hidden p-5 min-[1041px]:block" aria-label="Application steps">
          <div className="mb-2 flex items-center gap-3 border-b border-(--ap-line-2) pb-4">
            <JobThumb image={job.image} department={job.department} size={44} radius={10} />
            <div className="min-w-0">
              <b className="block text-[14.5px] leading-snug">{job.role}</b>
              <span className="text-[13px] text-(--ap-muted)">
                {job.company} · {job.location}
              </span>
            </div>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {APPLY_STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => void goTo(i)}
                    aria-current={current ? "step" : undefined}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-[10px] border-0 px-2.5 py-2 text-left text-[14px] ${FOCUS} ${
                      current ? "bg-(--ap-tint) font-semibold text-(--ap-violet)" : done ? "text-(--ap-ink-2) hover:bg-(--ap-tint)" : "text-(--ap-muted) hover:bg-(--ap-tint)"
                    }`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold ${
                        done ? "border-(--ap-violet) bg-(--ap-violet) text-white" : current ? "border-(--ap-violet) text-(--ap-violet)" : "border-[#d8cdb6]"
                      }`}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={2.4} aria-hidden="true" /> : i + 1}
                    </span>
                    {label}
                    {done ? <span className="sr-only"> (completed)</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="ap-bar mt-4" role="progressbar" aria-label="Application progress" aria-valuenow={sidePct} aria-valuemin={0} aria-valuemax={100}>
            <i className="transition-[width] duration-700" style={{ width: `${sidePct}%` }} />
          </div>
          <div className="mt-3">{saved}</div>
        </aside>

        {/* Main: plain on phones, one hairline box from tablet up */}
        <section ref={mainRef} className="pt-4 min-[768px]:rounded-[14px] min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ax-surface) min-[768px]:p-6 min-[768px]:pt-6" aria-labelledby="ap-step-title">
          <h1 id="ap-step-title" className="ap-serif text-[30px] max-[767px]:hidden">
            {APPLY_STEPS[step]}
          </h1>
          <p className="mb-5 text-[16px] leading-snug text-(--ap-ink-2) min-[768px]:mt-1.5 min-[768px]:text-[15px] min-[768px]:text-(--ap-muted)">{description}</p>

          <div key={step} className={dir > 0 ? "ap-step-fwd" : "ap-step-back"}>
            {step === 0 && <StepPersonal form={form} set={set} personal={personal} setPersonal={setPersonal} />}
            {step === 1 && <StepExperience form={form} set={set} toggleSector={toggleSector} />}
            {step === 2 && <StepSkills form={form} toggleSkill={toggleSkill} />}
            {step === 3 && <StepDocuments applicationId={applicationId} form={form} set={set} showErrors={tried} />}
            {step === 4 && (
              <>
                <StepScreening questions={questions} answers={readScreeningAnswers(form, questions)} onAnswer={setScreeningAnswer} missing={tried ? missing : []} />
                <StepTest test={test} showErrors={tried} />
              </>
            )}
            {step === 5 && (
              <StepReview
                form={form}
                questions={questions}
                test={test}
                ack={ack}
                setAck={setAck}
                showErrors={tried}
                onEdit={(s) => void goTo(s)}
                summary={{
                  name: form.fullName,
                  phone: form.phone,
                  email: form.email,
                  // personal.state is now state of ORIGIN, not residence — don't present it as the applicant's location.
                  location: locationFrom(personal.address, ""),
                  reusedDocs: reusedLabel ? reusedLabel.charAt(0).toUpperCase() + reusedLabel.slice(1) : "",
                  company: job.company,
                }}
              />
            )}
          </div>

          {isLast && missing.length > 0 ? (
            <p data-ap-invalid={tried ? true : undefined} className={warn} role="status">
              <CircleAlert className="mt-px size-4.5 shrink-0" strokeWidth={STROKE} aria-hidden="true" />
              <span>
                Answer screening question{missing.length > 1 ? "s" : ""} {joinAnd(missing)} before submitting.{" "}
                <button type="button" className={`${LINK_CLS} !min-h-0`} onClick={() => void fixAt(4)}>
                  Go to question
                </button>
              </span>
            </p>
          ) : null}

          {isLast && test.missing.length > 0 ? (
            <p data-ap-invalid={tried ? true : undefined} className={warn} role="status">
              <CircleAlert className="mt-px size-4.5 shrink-0" strokeWidth={STROKE} aria-hidden="true" />
              <span>
                Answer test question{test.missing.length > 1 ? "s" : ""} {joinAnd(test.missing)} before submitting.{" "}
                <button type="button" className={`${LINK_CLS} !min-h-0`} onClick={() => void fixAt(4)}>
                  Go to the test
                </button>
              </span>
            </p>
          ) : null}

          {isLast && missingDocs.length > 0 ? (
            <p data-ap-invalid={tried ? true : undefined} className={warn} role="status">
              <CircleAlert className="mt-px size-4.5 shrink-0" strokeWidth={STROKE} aria-hidden="true" />
              <span>
                Upload your {missingDocsLabel} before submitting.{" "}
                <button type="button" className={`${LINK_CLS} !min-h-0`} onClick={() => void fixAt(3)}>
                  Go to documents
                </button>
              </span>
            </p>
          ) : null}

          {isLast && submitClosed ? (
            <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-(--ap-line) bg-(--ap-tint) px-4 py-3.5 text-[14px] leading-snug text-(--ap-ink-2)">
              <CircleAlert className="mt-px size-4.5 shrink-0 text-(--ap-violet)" strokeWidth={STROKE} aria-hidden="true" />
              <span>
                <b className="block text-(--ap-ink)">Sending isn&apos;t open yet</b>
                Your answers are kept as a draft on this device. An application can only be sent once your CV, passport photo and valid ID have been received and checked, and that isn&apos;t switched on yet.
              </span>
            </div>
          ) : null}

          {/* Desktop / tablet footer */}
          <div className="mt-7 hidden items-center gap-2.5 border-t border-(--ap-line-2) pt-5 min-[768px]:flex">
            {step > 0 ? (
              <button type="button" onClick={() => void goTo(step - 1)} className={`${BTN} ap-btn-s ${FOCUS}`}>
                <ChevronLeft className="size-4" strokeWidth={STROKE} aria-hidden="true" />
                Back
              </button>
            ) : null}
            <span className="flex-1" />
            <button type="button" onClick={() => void saveAndExit()} className={`${BTN} ap-btn-s ${FOCUS}`}>
              Save &amp; exit
            </button>
            {isLast ? (
              <button type="button" onClick={() => void onSubmit()} aria-describedby={!canSubmit ? "ap-submit-hint" : undefined} aria-disabled={!canSubmit || undefined} className={`${BTN} ap-btn-hero ${canSubmit ? "ap-btn-p" : "bg-[#d9d2c3] text-[#7d7566]"} ${FOCUS}`}>
                <Check className="size-4" strokeWidth={2} aria-hidden="true" />
                Submit application
              </button>
            ) : (
              <button type="button" onClick={onContinue} className={`${BTN} ap-btn-p ap-btn-hero ${FOCUS}`}>
                Continue
              </button>
            )}
          </div>
          {isLast && !canSubmit ? (
            <span id="ap-submit-hint" className="sr-only">
              {submitClosed ? "Sending applications isn't open yet. Your draft is saved. " : ""}
              {missingDocs.length ? `Upload your ${missingDocsLabel}. ` : ""}
              {missing.length ? "Answer the required screening questions and tick the confirmation to submit." : "Tick the confirmation to submit."}
            </span>
          ) : null}
        </section>
      </div>

      {/* Phone: sticky Continue / Submit. Submit looks disabled until everything is ready; pressing it still shows what is missing. */}
      {isLast ? (
        <StickyActionBar label="Submit application" icon={<Check className="size-5" strokeWidth={2} aria-hidden="true" />} onClick={() => void onSubmit()} softDisabled={!canSubmit} hint={submitHint} />
      ) : (
        <StickyActionBar label="Continue" onClick={onContinue} />
      )}
    </div>
  );
}

/** ["CV", "passport photo", "valid ID"] -> "CV, passport photo and valid ID". */
function joinWords(words: string[]): string {
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : (words[0] ?? "");
}

/** Layout-shaped placeholder while the mock store hydrates and the draft resolves. */
function ApplySkeleton() {
  const bar = "ap-shimmer rounded-lg";
  return (
    <div className="ax-root" aria-busy="true" aria-label="Loading your application">
      <div className={`${bar} mb-3 h-5 w-36`} />
      <div className="grid grid-cols-1 items-start gap-5 min-[1041px]:grid-cols-[260px_minmax(0,1fr)]">
        <div className={`${CARD} hidden h-[440px] p-6 min-[1041px]:block`}>
          <div className={`${bar} h-12`} />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`${bar} mt-4 h-8`} />
          ))}
        </div>
        <div className={`${CARD} p-6`}>
          <div className={`${bar} h-7 w-16`} />
          <div className={`${bar} mt-3 h-9 w-2/3`} />
          <div className={`${bar} mt-3 h-5 w-1/2`} />
          <div className="mt-6 grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`${bar} h-12`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
