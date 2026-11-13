"use client";

/**
 * Create / edit vacancy (HR, spec 15). Sectioned form, mock in-memory save.
 * Which submit buttons show follows the capability flags from the adapter:
 * canPublish false (HR Officer) => "Submit for approval"; canPublish true
 * (HR Manager) => "Publish". Who approves a Pending Approval vacancy needs
 * Beeliv confirmation. Departments, clients/outlets, recruiters, employment
 * types and benefit kinds all come from the adapter config.
 *
 * Reused: DatePicker (form-fields), SelectMenu, NumberStepper (shared),
 * FieldError + useFlagInvalid (form-feedback), PageHeading, ErrorPanel, Chip.
 */
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/applicant/form-fields";
import { FieldError, useFlagInvalid, invalidAttrs } from "@/components/applicant/form-feedback";
import { ChevronLeft, Plus, Trash2 } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { NumberStepper } from "@/components/shared/NumberStepper";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Briefcase } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { JourneyEditor } from "@/components/admin/journey/JourneyEditor";
import { JourneyReadout } from "@/components/admin/journey/JourneyReadout";
import { useCan } from "@/lib/admin/role-access";
import { useJourneyTemplates } from "@/lib/admin/journey-templates/hooks";
import type { JourneyTemplate } from "@/lib/admin/journey-templates/types";
import { getDepartments, useRoles } from "@/lib/admin/lists/store";
import { copyJourney, hasStep } from "@/lib/journeys/types";
import { createVacancy, updateVacancy, useVacancy, useVacancyConfig } from "@/lib/admin/vacancies/hooks";
import { VacancyValidationError, type FieldErrors, type SaveIntent, type VacancyConfig, type VacancyDetail } from "@/lib/admin/vacancies/types";
import { listPublishedFor as listPublishedForms } from "@/lib/admin/tests/store";
import { COMPETITIVE_PAY, STATUS_LABEL } from "./meta";
import { emptyState, stateFromDetail, todayYmd, toInput, validateForm, type FormState } from "./formState";
import { SuggestionChips, TemplateChips } from "./SuggestionChips";
import { experienceTemplates, groupedSuggestionsFor, type SuggestionField } from "@/lib/admin/vacancies/suggestions";
import { JobPhotoSection } from "./JobPhotoSection";
import { Choice, FoldSection as Section, MoreOptions, PhoneFormBody, PhoneFormHead } from "@/components/admin/PhoneForm";
import { Restricted, VacancyStatusChip } from "./parts";

const LIST_HINT = "One item per line.";

function Field({ id, label, required, hint, error, children, className = "" }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div data-ap-field className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">
        {label}
        {required ? <span className="text-(--ap-rose)"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[13px] text-(--ap-muted)">{hint}</p> : null}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

const GRID2 = "grid grid-cols-1 gap-x-5 gap-y-4 min-[700px]:grid-cols-2";

export function VacancyForm({ vacancyId }: { vacancyId?: string }) {
  const config = useVacancyConfig();
  const existing = useVacancy(vacancyId ?? "");
  const editing = !!vacancyId;
  const back = vacancyId ? `/admin/recruitment/vacancies/${vacancyId}` : "/admin/recruitment/vacancies";
  const title = editing ? "Edit vacancy" : "New vacancy";

  const failed = config.status === "error" || (editing && existing.status === "error");
  if (failed) {
    return (
      <>
        <BackLink href={back} />
        <PageHeading title={title} />
        <ErrorPanel title="We could not load the vacancy form" retry={() => { config.retry(); existing.retry(); }} />
      </>
    );
  }
  if (config.status === "restricted" || (editing && existing.status === "restricted")) {
    return (
      <>
        <BackLink href={back} />
        <PageHeading title={title} />
        <Restricted what="Vacancies" />
      </>
    );
  }
  if (editing && existing.status === "empty") {
    return (
      <>
        <BackLink href={back} />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Briefcase} title="Vacancy not found" description="This vacancy does not exist or is outside your assigned clients and outlets." />
        </div>
      </>
    );
  }
  if (!config.data || (editing && !existing.data)) return <FormSkeleton title={title} />;
  if (!config.data.capabilities.canCreate && !editing) {
    return (
      <>
        <BackLink href={back} />
        <PageHeading title={title} />
        <Restricted what="Creating vacancies" />
      </>
    );
  }
  return <FormBody config={config.data} existing={existing.data} back={back} title={title} />;
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
      <ChevronLeft className="size-4" aria-hidden="true" /> Back
    </Link>
  );
}

function FormBody({ config, existing, back, title }: { config: VacancyConfig; existing: VacancyDetail | null; back: string; title: string }) {
  const router = useRouter();
  // A new vacancy opened from a client or outlet page: ?client=<id>&outlet=<id>&outletName=<name> pre-selects them.
  const sp = useSearchParams();
  const [s, setS] = useState<FormState>(() => {
    if (existing) return stateFromDetail(existing);
    const base = emptyState(config);
    const client = config.clients.find((c) => c.id === sp.get("client"));
    if (!client) return base;
    const wantedId = sp.get("outlet");
    const wantedName = sp.get("outletName");
    const outlet = client.outlets.find((o) => o.id === wantedId) ?? client.outlets.find((o) => !!wantedName && o.name === wantedName) ?? (client.outlets.length === 1 ? client.outlets[0] : undefined);
    return { ...base, clientId: client.id, outletId: outlet?.id ?? "" };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<SaveIntent | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [positionId, setPositionId] = useState("");
  // True once the journey, documents, questions or test were changed by hand (so picking a template asks first).
  const [setupTouched, setSetupTouched] = useState(!!existing);
  const templates = useJourneyTemplates();
  const prototypePositions = useRoles();
  const liveBackend = process.env.NEXT_PUBLIC_VACANCIES_BACKEND_ENABLED === 'true';
  const positions = liveBackend ? [] : prototypePositions;
  const ref = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(ref);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setS((p) => ({ ...p, [k]: v }));

  // Sample suggestions follow the chosen position, then the job title and department.
  const positionName = positions.find((r) => r.id === positionId)?.name ?? "";
  const sug = (f: SuggestionField) => groupedSuggestionsFor(f, positionName, s.title, s.department);
  const addLine = (f: SuggestionField | "expSummary", id: string, next: string) => {
    set(f, next);
    void id; // focus stays on the chip so keyboard users keep their place
  };
  const expMinN = Number(s.expMin) || 0;
  const expMaxN = s.expMax ? Number(s.expMax) : null;
  const expTemplates = experienceTemplates(expMinN, expMaxN, positionName, s.title, s.department);

  const caps = config.capabilities;
  const status = existing?.status ?? "draft";
  const allowed = existing?.allowedActions ?? [];
  const isDraftLike = !existing || status === "draft";
  const showPublish = existing ? allowed.includes("publish") : caps.canPublish;
  const showSubmit = existing ? allowed.includes("submit-for-approval") : caps.canSubmitForApproval && !caps.canPublish;
  const canPickStart = !existing || status === "draft";
  const lockStructure = !!existing && (existing.countsReady === false || !existing.counts || existing.counts.applications > 0);
  const prototypeCanEditJourney = useCan("journey.edit");
  const canEditJourney = liveBackend ? (existing ? existing.canEdit : caps.canCreate) : prototypeCanEditJourney;
  const activeTemplates = liveBackend ? [] : (templates.data ?? []).filter((t) => !t.archived);
  const testOptions = liveBackend ? [] : listPublishedForms("applicants").filter((f) => f.kind === "test").map((f) => ({ value: f.id, label: f.title }));
  // The screening-questions problem shows on its journey step.
  const screenId = s.journey.find((j) => j.kind === "screening-questions")?.id;
  const journeyErrors: Record<string, string | undefined> = { ...errors, ...(screenId && errors.questions ? { [screenId]: errors.questions } : {}) };
  const clientOutlets = config.clients.find((c) => c.id === s.clientId)?.outlets ?? [];
  const err = (k: string) => errors[k];
  const bad = (k: string) => invalidAttrs(!!errors[k]);

  async function save(intent: SaveIntent) {
    const pastOk = !!existing && existing.closesOn === s.closesOn && intent === "save";
    const found = validateForm(s, pastOk);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) {
      flag();
      return;
    }
    setBusy(intent);
    try {
      const d = existing ? await updateVacancy(existing.id, toInput(s), intent, existing.revision) : await createVacancy(toInput(s), intent);
      const saved = intent === "publish" ? "published" : intent === "submit-for-approval" ? "submitted" : existing ? "updated" : "draft";
      router.push(`/admin/recruitment/vacancies/${d.id}?saved=${saved}`);
    } catch (e) {
      if (e instanceof VacancyValidationError) {
        setErrors(e.fields);
        flag();
      } else setFailure(e instanceof Error ? e.message : "We could not confirm the save. Reload the vacancy to check.");
      setBusy(null);
    }
  }

  function pickPosition(id: string) {
    setPositionId(id);
    const role = positions.find((r) => r.id === id);
    if (!role) return;
    const dept = getDepartments().find((d) => d.id === role.departmentId)?.name ?? "";
    setS((p) => ({ ...p, title: role.name, department: config.departments.includes(dept) ? dept : p.department }));
  }

  async function applyTemplate(id: string) {
    const t: JourneyTemplate | undefined = activeTemplates.find((x) => x.id === id);
    if (!t) {
      setTemplateId("");
      return;
    }
    if (setupTouched) {
      const ok = await confirmAction({
        tone: "caution",
        title: `Use the ${t.name} template?`,
        description: "This replaces the journey, documents, screening questions and test on this job. Your other details stay as they are. You can change anything afterwards.",
        confirmLabel: "Use template",
        cancelLabel: "Keep mine",
      });
      if (!ok) return;
    }
    setTemplateId(id);
    setSetupTouched(false);
    // The job gets its OWN COPY: fresh ids, so later edits never touch the template, and template edits never touch this job.
    setS((p) => ({
      ...p,
      journey: copyJourney(t.journey),
      docsApply: t.documents.atApplication.join("\n"),
      docsAfter: t.documents.afterSelection.join("\n"),
      questions: t.screeningQuestions.map((q) => ({ ...q, id: crypto.randomUUID() })),
      testFormId: t.testFormId ?? "",
      about: t.about ? t.about : p.about,
    }));
  }

  const saveLabel = isDraftLike ? "Save draft" : "Save changes";
  const sel = (id: string, key: keyof FormState & string, options: { value: string; label: string }[] | string[], placeholder: string, invalid?: boolean, onPick?: (v: string) => void) => (
    <Choice id={id} value={String(s[key])} options={options} placeholder={placeholder} onChange={onPick ?? ((v) => set(key, v as never))} invalid={invalid} describedBy={invalid ? `${id}-err` : undefined} />
  );

  return (
    <PhoneFormBody className="max-w-[1000px]">
      <PhoneFormHead backHref={back} backLabel={existing ? "the vacancy" : "vacancies"} title={title} />
      <div className="max-[767px]:hidden">
        <BackLink href={back} />
        <PageHeading title={title} right={existing ? <VacancyStatusChip status={status} /> : <span className="ap-chip ap-chip-mute">New, saved as {STATUS_LABEL.draft}</span>} />
      </div>

      <form
        ref={ref}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save("save");
        }}
        className="flex flex-col gap-4"
      >
        {canPickStart ? (
          <Section title="Start from" startClosed summary={positionId || templateId ? "Position or template chosen" : "Position or template (optional)"}>
            <div className={GRID2}>
              <Field id="vf-position" label="Position" hint="Optional. Fills the job title and department. You can change both.">
                <SelectMenu id="vf-position" label="Position" value={positionId} placeholder="Choose a position" options={[{ value: "", label: "No position, I will type the title" }, ...positions.map((r) => ({ value: r.id, label: r.name }))]} onChange={pickPosition} />
              </Field>
              <Field id="vf-template" label="Template" hint={templateId ? "This job has its own copy. Changing it here does not change the template." : "Optional. Fills the journey, documents and screening questions. You can change anything afterwards."}>
                <SelectMenu
                  id="vf-template"
                  label="Template"
                  value={templateId}
                  placeholder={templates.status === "loading" ? "Loading templates" : "No template"}
                  options={[{ value: "", label: "No template, start blank" }, ...activeTemplates.map((t) => ({ value: t.id, label: t.sample ? `${t.name} (sample)` : t.name }))]}
                  onChange={(v) => void (v ? applyTemplate(v) : setTemplateId(""))}
                />
              </Field>
            </div>
          </Section>
        ) : null}

        <Section title="Basics" summary={[s.title.trim(), s.employmentType].filter(Boolean).join(" · ") || "Title, type, client and closing date"}>
          <div className={GRID2}>
            {/* Phone order: the essentials, then More options. min-[768px]:order-N keeps the desktop order unchanged. */}
            <Field id="vf-title" label="Job title" required error={err("title")} className="min-[700px]:col-span-2 min-[768px]:order-1">
              <input id="vf-title" className="ap-input" value={s.title} maxLength={120} onChange={(e) => set("title", e.target.value)} {...bad("title")} aria-describedby={err("title") ? "vf-title-err" : undefined} />
            </Field>
            <Field id="vf-type" label="Employment type" required error={err("employmentType")} className="min-[768px]:order-3">
              {sel("vf-type", "employmentType", config.employmentTypes, "Choose a type", !!err("employmentType"))}
            </Field>
            <Field id="vf-client" label="Client" required error={err("clientId")} className="min-[768px]:order-4">
              {sel("vf-client", "clientId", config.clients.map((c) => ({ value: c.id, label: c.name })), "Choose a client", !!err("clientId"), (v) => {
                const outlets = config.clients.find((c) => c.id === v)?.outlets ?? [];
                setS((p) => ({ ...p, clientId: v, outletId: outlets.length === 1 ? outlets[0].id : "" }));
              })}
            </Field>
            <Field id="vf-outlet" label="Outlet" required error={err("outletId")} className="min-[768px]:order-5">
              {sel("vf-outlet", "outletId", clientOutlets.map((o) => ({ value: o.id, label: o.name })), s.clientId ? "Choose an outlet" : "Choose a client first", !!err("outletId"))}
            </Field>
            <Field id="vf-closes" label="Closing date" required error={err("closesOn")} hint="Required on every vacancy. Applicants see it as Closes <date>." className="min-[768px]:order-9">
              <DatePicker id="vf-closes" title="Closing date" value={s.closesOn} min={existing && existing.closesOn === s.closesOn ? undefined : todayYmd()} onChange={(v) => set("closesOn", v)} invalid={!!err("closesOn")} describedBy={err("closesOn") ? "vf-closes-err" : undefined} />
            </Field>
            <MoreOptions>
              <Field id="vf-department" label="Department" required error={err("department")} className="min-[768px]:order-2">
                {sel("vf-department", "department", config.departments, "Choose a department", !!err("department"))}
              </Field>
              <Field id="vf-location" label="Job location" required error={err("location")} className="min-[768px]:order-6">
                <input id="vf-location" className="ap-input" value={s.location} maxLength={80} onChange={(e) => set("location", e.target.value)} {...bad("location")} aria-describedby={err("location") ? "vf-location-err" : undefined} />
              </Field>
              <Field id="vf-openings" label="Openings" required error={err("openings")} className="min-[768px]:order-7">
                <NumberStepper id="vf-openings" value={s.openings} onChange={(v) => set("openings", v)} error={err("openings") ?? null} max={999} />
              </Field>
              <Field id="vf-recruiter" label="Assigned recruiter" hint="Optional. Leave unassigned if not decided." className="min-[768px]:order-8">
                {sel("vf-recruiter", "recruiterId", [{ value: "", label: "Unassigned" }, ...config.recruiters.map((r) => ({ value: r.id, label: r.name }))], "Unassigned")}
              </Field>
              <Field id="vf-resume" label="Expected resumption date" className="min-[768px]:order-10">
                <DatePicker id="vf-resume" title="Expected resumption" value={s.expectedResumption} min={todayYmd()} onChange={(v) => set("expectedResumption", v)} />
              </Field>
            </MoreOptions>
          </div>
        </Section>

        {liveBackend ? <p className="ap-card rounded-2xl p-4">Job photo uploads are not available yet. Published vacancies use the neutral job illustration.</p> : <JobPhotoSection s={s} config={config} existing={existing} onPhoto={(p) => set("photo", p)} onAlt={(v) => set("photoAlt", v)} altError={err("photoAlt")} />}

        <Section title="About the role" summary={s.about.trim() ? `${s.about.trim().length} characters` : "Describe the job"}>
          <Field id="vf-about" label="About the role">
            <textarea id="vf-about" className="ap-input" rows={5} value={s.about} maxLength={2000} onChange={(e) => set("about", e.target.value)} />
          </Field>
          <Field id="vf-resp" label="Key responsibilities" hint={LIST_HINT} className="mt-4">
            <textarea id="vf-resp" className="ap-input" rows={6} value={s.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} />
              <SuggestionChips noun="responsibility" groups={sug("responsibilities")} value={s.responsibilities} onChange={(n) => addLine("responsibilities", "vf-resp", n)} />
          </Field>
        </Section>

        <Section title="Requirements">
          <div className={GRID2}>
            <Field id="vf-essential" label="Essential requirements" hint={LIST_HINT}>
              <textarea id="vf-essential" className="ap-input" rows={6} value={s.essential} onChange={(e) => set("essential", e.target.value)} />
              <SuggestionChips noun="requirement" groups={sug("essential")} value={s.essential} onChange={(n) => addLine("essential", "vf-essential", n)} />
            </Field>
            <Field id="vf-preferred" label="Preferred requirements" hint={`${LIST_HINT} Nice to have: HR does not reject for a missing preferred item.`}>
              <textarea id="vf-preferred" className="ap-input" rows={6} value={s.preferred} onChange={(e) => set("preferred", e.target.value)} />
              <SuggestionChips noun="nice-to-have" groups={sug("preferred")} value={s.preferred} onChange={(n) => addLine("preferred", "vf-preferred", n)} />
            </Field>
            <Field id="vf-expmin" label="Minimum years of experience">
              <NumberStepper id="vf-expmin" value={s.expMin} onChange={(v) => set("expMin", v)} min={0} max={50} />
            </Field>
            <Field id="vf-expmax" label="Maximum years (optional)" error={err("expMax")}>
              <input id="vf-expmax" inputMode="numeric" className="ap-input" value={s.expMax} onChange={(e) => set("expMax", e.target.value.replace(/\D/g, ""))} {...bad("expMax")} aria-describedby={err("expMax") ? "vf-expmax-err" : undefined} />
            </Field>
            <Field id="vf-expsum" label="Experience summary" hint="Tip: keep it to one sentence applicants will read first." className="min-[700px]:col-span-2">
              <input id="vf-expsum" className="ap-input" value={s.expSummary} maxLength={200} onChange={(e) => set("expSummary", e.target.value)} />
              <TemplateChips items={expTemplates} current={s.expSummary} onPick={(x) => addLine("expSummary", "vf-expsum", x)} />
            </Field>
            <Field id="vf-skills" label="Skills" hint={LIST_HINT} className="min-[700px]:col-span-2">
              <textarea id="vf-skills" className="ap-input" rows={4} value={s.skills} onChange={(e) => set("skills", e.target.value)} />
              <SuggestionChips noun="skill" groups={sug("skills")} value={s.skills} onChange={(n) => addLine("skills", "vf-skills", n)} />
            </Field>
          </div>
        </Section>

        <Section title="Salary and benefits" summary={s.salaryMin || s.salaryMax ? `NGN ${s.salaryMin || "?"} to ${s.salaryMax || "?"}, ${s.frequency}` : "Pay range and benefits"}>
          <div className={GRID2}>
            <Field id="vf-smin" label="Salary from (NGN)">
              <input id="vf-smin" inputMode="numeric" className="ap-input" value={s.salaryMin} onChange={(e) => set("salaryMin", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field id="vf-smax" label="Salary to (NGN)" error={err("salaryMax")}>
              <input id="vf-smax" inputMode="numeric" className="ap-input" value={s.salaryMax} onChange={(e) => set("salaryMax", e.target.value.replace(/\D/g, ""))} {...bad("salaryMax")} aria-describedby={err("salaryMax") ? "vf-smax-err" : undefined} />
            </Field>
            <Field id="vf-sfreq" label="Paid">
              {sel("vf-sfreq", "frequency", ["Monthly", "Weekly", "Daily"], "Monthly")}
            </Field>
            <label className="flex items-center gap-2.5 self-end pb-3 text-[15px]">
              <input type="checkbox" className="size-5 accent-(--ap-violet)" checked={s.negotiable} onChange={(e) => set("negotiable", e.target.checked)} /> Negotiable
            </label>
          </div>
          <fieldset className="mt-4 min-w-0 border-0 p-0">
            <legend className="mb-1.5 text-[14px] font-semibold text-(--ap-ink-2)">Salary visibility</legend>
            <div className="flex flex-wrap gap-2">
              {(["public", "internal"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={s.visibility === v} onClick={() => set("visibility", v)} className="ap-pick inline-flex h-11 items-center rounded-xl border border-(--ap-line) px-4 text-[14px] font-semibold">
                  {v === "public" ? "Public" : "Internal only"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[13px] text-(--ap-muted)">{s.visibility === "internal" ? `Applicants will see "${COMPETITIVE_PAY}". The figure stays inside Beeliv.` : "Applicants will see the salary range."}</p>
          </fieldset>

          <h3 className="mt-6 mb-2 text-[14px] font-bold">Benefits</h3>
          <div className="flex flex-col gap-3">
            {s.benefits.length === 0 ? <p className="text-[14px] text-(--ap-muted)">No benefits added. Each benefit can be public or internal only.</p> : null}
            {s.benefits.map((b, i) => (
              <div key={b.id} className="grid grid-cols-1 gap-2 rounded-xl border border-(--ap-line) p-3 min-[700px]:grid-cols-[170px_minmax(0,1fr)_150px_44px] min-[700px]:items-center">
                <SelectMenu label={`Benefit ${i + 1} type`} value={b.kind} options={config.benefitKinds} placeholder="Type" onChange={(v) => set("benefits", s.benefits.map((x) => (x.id === b.id ? { ...x, kind: v } : x)))} />
                <input aria-label={`Benefit ${i + 1} detail`} className="ap-input" placeholder="Detail" value={b.detail} maxLength={120} onChange={(e) => set("benefits", s.benefits.map((x) => (x.id === b.id ? { ...x, detail: e.target.value } : x)))} />
                <SelectMenu label={`Benefit ${i + 1} visibility`} value={b.visibility} options={[{ value: "public", label: "Public" }, { value: "internal", label: "Internal only" }]} onChange={(v) => set("benefits", s.benefits.map((x) => (x.id === b.id ? { ...x, visibility: v as "public" | "internal" } : x)))} />
                <button type="button" aria-label={`Remove benefit ${i + 1}`} onClick={() => set("benefits", s.benefits.filter((x) => x.id !== b.id))} className="ap-hit flex size-11 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set("benefits", [...s.benefits, { id: crypto.randomUUID(), kind: "", detail: "", visibility: "public" }])} className="ap-btn ap-btn-s ap-btn-sm self-start">
              <Plus className="size-4" aria-hidden="true" /> Add benefit
            </button>
          </div>
        </Section>

        <Section title="Working conditions">
          <div className={GRID2}>
            <Field id="vf-days" label="Working days"><input id="vf-days" className="ap-input" value={s.workingDays} onChange={(e) => set("workingDays", e.target.value)} /></Field>
            <Field id="vf-shift" label="Shift system"><input id="vf-shift" className="ap-input" value={s.shiftSystem} onChange={(e) => set("shiftSystem", e.target.value)} /></Field>
            <Field id="vf-hours" label="Hours"><input id="vf-hours" className="ap-input" value={s.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
            <Field id="vf-weekends" label="Weekends"><input id="vf-weekends" className="ap-input" value={s.weekends} onChange={(e) => set("weekends", e.target.value)} /></Field>
            <Field id="vf-holidays" label="Public holidays"><input id="vf-holidays" className="ap-input" value={s.publicHolidays} onChange={(e) => set("publicHolidays", e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Journey">
          {!canEditJourney ? (
            <>
              <JourneyReadout journey={s.journey} />
              <p className="mt-3 text-[13px] text-(--ap-muted)">Only Operations and the HR Manager can change a job&apos;s journey.</p>
            </>
          ) : (
          <>
          <JourneyEditor
            journey={s.journey}
            onJourney={(j) => {
              setSetupTouched(true);
              set("journey", j);
            }}
            extras={{ docsApply: s.docsApply, docsAfter: s.docsAfter, questions: s.questions, testFormId: s.testFormId, interviewMethod: s.interviewMethod, interviewLocation: s.interviewLocation }}
            onExtras={(p) => {
              setSetupTouched(true);
              setS((prev) => ({
                ...prev,
                ...(p.docsApply !== undefined ? { docsApply: p.docsApply } : {}),
                ...(p.docsAfter !== undefined ? { docsAfter: p.docsAfter } : {}),
                ...(p.questions !== undefined ? { questions: p.questions } : {}),
                ...(p.testFormId !== undefined ? { testFormId: p.testFormId } : {}),
                ...(p.interviewMethod !== undefined ? { interviewMethod: p.interviewMethod } : {}),
                ...(p.interviewLocation !== undefined ? { interviewLocation: p.interviewLocation } : {}),
              }));
            }}
            errors={journeyErrors}
            tests={testOptions}
            lockStructure={lockStructure}
            lockNote="This job already has applications, so steps can be added or renamed but not removed or moved. Whether that rule is right needs Beeliv confirmation."
          />
          {!hasStep(s.journey, "interview") && s.interviewMethod ? <p className="mt-3 text-[13px] text-(--ap-muted)">There is no interview step, so the interview note is not saved.</p> : null}
          </>
          )}
        </Section>

        {failure ? (
          <p role="alert" className="text-[15px] font-semibold text-(--ap-rose)">
            {failure}
          </p>
        ) : null}
        {Object.keys(errors).length > 0 ? (
          <p role="alert" className="text-[14px] font-semibold text-(--ap-rose)">
            Some required fields need attention. They are marked above.
          </p>
        ) : null}

        <div className="pf-bar flex flex-col-reverse gap-2.5 min-[700px]:flex-row min-[700px]:flex-wrap min-[700px]:justify-end">
          <Link href={back} data-pf-cancel="" className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
            Cancel
          </Link>
          <button type="submit" disabled={busy !== null} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
            {busy === "save" ? "Saving..." : saveLabel}
          </button>
          {showSubmit ? (
            <button type="button" disabled={busy !== null} onClick={() => void save("submit-for-approval")} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
              {busy === "submit-for-approval" ? "Submitting..." : "Submit for approval"}
            </button>
          ) : null}
          {showPublish ? (
            <button type="button" disabled={busy !== null} onClick={() => void save("publish")} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
              {busy === "publish" ? "Publishing..." : "Publish"}
            </button>
          ) : null}
        </div>
        {showSubmit ? <p className="text-right text-[13px] text-(--ap-muted)">Your account submits vacancies for approval. Who approves them needs Beeliv confirmation.</p> : null}
      </form>
    </PhoneFormBody>
  );
}

function FormSkeleton({ title }: { title: string }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading the vacancy form" className="max-w-[1000px]">
      <h1 className="sr-only">{title}</h1>
      <div className={`${sk} mb-3 h-6 w-20`} />
      <div className={`${sk} mb-4 h-12 w-64`} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${sk} mb-4 h-[220px]`} />
      ))}
    </div>
  );
}
