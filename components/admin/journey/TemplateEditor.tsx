"use client";

/**
 * Create / edit one job template (Lists & Rules). Uses the SAME JourneyEditor as
 * the vacancy form. Saving a template never changes a vacancy that already used it.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { JourneyEditor } from "@/components/admin/journey/JourneyEditor";
import { BackHeader, BackLink } from "@/components/admin/ops/assign/kit";
import { Restricted } from "@/components/admin/vacancies/parts";
import { FoldSection as Section, PhoneFormBody } from "@/components/admin/PhoneForm";
import { FieldError, useFlagInvalid, invalidAttrs } from "@/components/applicant/form-feedback";
import { Layers } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { createJourneyTemplate, updateJourneyTemplate, useJourneyTemplate } from "@/lib/admin/journey-templates/hooks";
import { TemplateValidationError, type JourneyTemplate, type TemplateFieldErrors, type TemplateInput } from "@/lib/admin/journey-templates/types";
import { roleCan, useAccessRole } from "@/lib/admin/role-access";
import { listPublishedFor as listPublishedForms } from "@/lib/admin/tests/store";
import { blankJourney, hasStep, validateJourney, type Journey } from "@/lib/journeys/types";
import type { ScreeningQuestion } from "@/lib/admin/vacancies/types";
import { TEMPLATES_HREF } from "./TemplatesList";

interface State {
  name: string;
  description: string;
  about: string;
  journey: Journey;
  docsApply: string;
  docsAfter: string;
  questions: ScreeningQuestion[];
  testFormId: string;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

const fromTemplate = (t: JourneyTemplate): State => ({
  name: t.name,
  description: t.description,
  about: t.about ?? "",
  journey: structuredClone(t.journey),
  docsApply: t.documents.atApplication.join("\n"),
  docsAfter: t.documents.afterSelection.join("\n"),
  questions: t.screeningQuestions.map((q) => ({ ...q })),
  testFormId: t.testFormId ?? "",
});

const blank = (): State => ({
  name: "",
  description: "",
  about: "",
  journey: blankJourney(),
  docsApply: ["CV", "Passport photograph", "Valid ID"].join("\n"),
  docsAfter: "",
  questions: [],
  testFormId: "",
});

function toInput(s: State): TemplateInput {
  return {
    name: s.name.trim(),
    description: s.description.trim(),
    about: s.about.trim() || undefined,
    journey: structuredClone(s.journey),
    // Content belongs to its journey step: a step that is not in the journey has no content.
    documents: { atApplication: hasStep(s.journey, "documents-at-application") ? lines(s.docsApply) : [], afterSelection: hasStep(s.journey, "documents-after-selection") ? lines(s.docsAfter) : [] },
    screeningQuestions: hasStep(s.journey, "screening-questions") ? s.questions.filter((q) => q.text.trim()).map((q) => ({ ...q, text: q.text.trim() })) : [],
    testFormId: hasStep(s.journey, "test-or-form") && s.testFormId ? s.testFormId : undefined,
  };
}

export function TemplateEditor({ templateId }: { templateId?: string }) {
  const role = useAccessRole();
  const existing = useJourneyTemplate(templateId ?? "");
  const editing = !!templateId;
  const title = editing ? "Edit job template" : "New job template";
  const head = (
    <>
      <BackHeader href={TEMPLATES_HREF} label="Job templates" title={title} />
      <BackLink href={TEMPLATES_HREF} label="Job templates" />
    </>
  );
  const heading = (
    <div className="max-[767px]:hidden">
      <PageHeading title={title} />
    </div>
  );

  if (role === null) return <div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />;
  if (!roleCan(role, "journeyTemplates.manage") || (editing && existing.status === "restricted")) {
    return (
      <div>
        {head}
        {heading}
        <Restricted what="Job templates" />
      </div>
    );
  }
  if (editing && existing.status === "error") {
    return (
      <div>
        {head}
        {heading}
        <ErrorPanel title="We could not load this template" retry={existing.retry} />
      </div>
    );
  }
  if (editing && existing.status === "empty") {
    return (
      <div>
        {head}
        <section className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Layers} title="Template not found" description="This template does not exist." action={<Link href={TEMPLATES_HREF} className="ap-btn ap-btn-s ap-btn-sm">Back to job templates</Link>} />
        </section>
      </div>
    );
  }
  if (editing && !existing.data) return <div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading template" />;
  return (
    <div>
      {head}
      {heading}
      <Body key={existing.data?.id ?? "new"} template={existing.data} />
    </div>
  );
}

function Body({ template }: { template: JourneyTemplate | null }) {
  const router = useRouter();
  const [s, setS] = useState<State>(() => (template ? fromTemplate(template) : blank()));
  const [errors, setErrors] = useState<TemplateFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(ref);
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  const testOptions = listPublishedForms("applicants").filter((f) => f.kind === "test").map((f) => ({ value: f.id, label: f.title }));
  const screenId = s.journey.find((j) => j.kind === "screening-questions")?.id;
  const journeyErrors: Record<string, string | undefined> = { ...errors, ...(screenId && errors.questions ? { [screenId]: errors.questions } : {}) };

  async function save() {
    const found: TemplateFieldErrors = { ...validateJourney(s.journey) };
    if (!s.name.trim()) found.name = "Enter a name for the template.";
    else if (s.name.trim().length > 60) found.name = "Keep the name under 60 characters.";
    if (hasStep(s.journey, "screening-questions") && s.questions.some((q) => !q.text.trim())) found.questions = "Write each screening question, or remove the empty one.";
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) {
      flag();
      return;
    }
    setBusy(true);
    try {
      if (template) await updateJourneyTemplate(template.id, toInput(s));
      else await createJourneyTemplate(toInput(s));
      router.push(`${TEMPLATES_HREF}?saved=${template ? "updated" : "created"}`);
    } catch (e) {
      if (e instanceof TemplateValidationError) {
        setErrors(e.fields);
        flag();
      } else setFailure("We could not save this template. Nothing was changed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <PhoneFormBody>
    <form
      ref={ref}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex max-w-[1000px] flex-col gap-4"
    >
      {template ? <p className="max-w-[70ch] text-[14px] text-(--ap-muted)">Jobs that already used this template keep their own copy. Changes here apply to jobs created from it from now on.</p> : null}
      {template?.sample ? <p className="max-w-[70ch] text-[13px] text-(--ap-muted)">This is a sample template, shown so you can see how templates work. Edit it to match how Beeliv works, or duplicate it from the list.</p> : null}

      <Section title="Details" summary={s.name.trim() || "Name and note"}>
        <div className="grid grid-cols-1 gap-4">
          <div data-ap-field className="max-w-[460px]">
            <label htmlFor="jt-name" className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">
              Template name <span className="text-(--ap-rose)">*</span>
            </label>
            <input id="jt-name" className="ap-input" value={s.name} maxLength={60} onChange={(e) => set("name", e.target.value)} {...invalidAttrs(!!errors.name)} aria-describedby={errors.name ? "jt-name-err" : undefined} />
            <FieldError id="jt-name-err">{errors.name}</FieldError>
          </div>
          <div data-ap-field>
            <label htmlFor="jt-desc" className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">
              Note for the team
            </label>
            <textarea id="jt-desc" className="ap-input" rows={2} value={s.description} maxLength={300} onChange={(e) => set("description", e.target.value)} />
            <p className="mt-1 text-[13px] text-(--ap-muted)">Optional. Only Beeliv staff see this, for example when to use the template.</p>
          </div>
        </div>
      </Section>

      <Section title="Journey">
        <JourneyEditor
          journey={s.journey}
          onJourney={(j) => set("journey", j)}
          extras={{ docsApply: s.docsApply, docsAfter: s.docsAfter, questions: s.questions, testFormId: s.testFormId }}
          onExtras={(p) =>
            setS((prev) => ({
              ...prev,
              ...(p.docsApply !== undefined ? { docsApply: p.docsApply } : {}),
              ...(p.docsAfter !== undefined ? { docsAfter: p.docsAfter } : {}),
              ...(p.questions !== undefined ? { questions: p.questions } : {}),
              ...(p.testFormId !== undefined ? { testFormId: p.testFormId } : {}),
            }))
          }
          errors={journeyErrors}
          tests={testOptions}
        />
      </Section>

      <Section title="Job description text">
        <label htmlFor="jt-about" className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">
          About the role
        </label>
        <textarea id="jt-about" className="ap-input" rows={4} value={s.about} maxLength={2000} onChange={(e) => set("about", e.target.value)} />
        <p className="mt-1 text-[13px] text-(--ap-muted)">Optional. A new job gets this text only when you fill it in. Whether templates should hold description text at all needs Beeliv confirmation.</p>
      </Section>

      {failure ? (
        <p role="alert" className="text-[15px] font-semibold text-(--ap-rose)">
          {failure}
        </p>
      ) : null}
      {Object.keys(errors).length > 0 ? (
        <p role="alert" className="text-[14px] font-semibold text-(--ap-rose)">
          Some things need attention. They are marked above.
        </p>
      ) : null}

      <div className="pf-bar flex flex-col-reverse gap-2.5 min-[700px]:flex-row min-[700px]:justify-end">
        <Link href={TEMPLATES_HREF} data-pf-cancel="" className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
          Cancel
        </Link>
        <button type="submit" disabled={busy} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
          {busy ? "Saving..." : template ? "Save changes" : "Create template"}
        </button>
      </div>
    </form>
    </PhoneFormBody>
  );
}
