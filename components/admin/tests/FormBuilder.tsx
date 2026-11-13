"use client";

/**
 * Test / form builder (HR): /new and /[id]. Left: details and the question list (add, move up/down, duplicate, delete).
 * Right: "How people see this", rendered by the SAME QuestionField the taker uses. On narrow screens an Edit / Preview
 * switch replaces the side-by-side layout. Save draft, Publish, Unpublish, Archive all go through confirmAction;
 * editing a published form saves a new version. Pass mark may stay blank ("Beeliv to confirm") and never decides anything.
 *
 * Reused: PageHeading-style detail title (DETAIL_TITLE), EmptyState, SelectMenu, confirmAction, ErrorPanel, RowMenu,
 * StatusChip (via parts), QuestionField (components/forms), useUrlParams.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { FileText, Plus } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { useUrlParams } from "@/components/admin/applicants/url";
import { QuestionField } from "@/components/forms/QuestionField";
import { duplicateForm, saveForm, setFormStatus, useFacets, useFormRecord } from "@/lib/admin/tests/hooks";
import type { FormInput } from "@/lib/admin/tests/store";
import type { AnswerValue, FormAudience, FormDefinition, FormKind, FormQuestion, FormStatus } from "@/lib/forms/types";
import { QuestionEditor, blankQuestion, normaliseQuestion, newId, type QuestionErrors } from "./QuestionEditor";
import { Choice, FoldSection as Section, MoreOptions, PhoneFormBody, PhoneFormHead } from "@/components/admin/PhoneForm";
import { AUDIENCE_LABEL, BackLink, DetailSkeleton, FormStatusChip, KindChip, Notice, Restricted, formHref, resultsHref, isChoice } from "./parts";
import { TESTS_HREF } from "./parts";

export function FormBuilder({ id }: { id: string | null }) {
  const live = useFormRecord(id);
  const facets = useFacets();

  if (live.status === "error") {
    return (
      <>
        <BackLink />
        <ErrorPanel title="We could not load this test or form" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        <BackLink />
        <Restricted what="This test or form" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <BackLink />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={FileText} title="Test or form not found" description="It may have been removed, or it is outside your access." />
        </div>
      </>
    );
  }
  if (id !== null && !live.data) return <DetailSkeleton label="Loading test or form" />;
  const form = live.data?.form ?? null;
  return <Body key={id ?? "new"} initial={form} submissionCount={live.data?.submissionCount ?? 0} departments={facets?.departments ?? []} clients={facets?.clients ?? []} />;
}

/* ---------------- editing model ---------------- */

interface Draft {
  kind: FormKind;
  title: string;
  description: string;
  audience: FormAudience;
  clientName: string;
  timeLimit: string;
  passMark: string;
  questions: FormQuestion[];
}

const toDraft = (f: FormDefinition | null): Draft =>
  f
    ? { kind: f.kind, title: f.title, description: f.description, audience: f.audience, clientName: f.clientName ?? "", timeLimit: f.timeLimitMinutes?.toString() ?? "", passMark: f.passMarkPercent?.toString() ?? "", questions: f.questions }
    : { kind: "test", title: "", description: "", audience: "applicants", clientName: "", timeLimit: "", passMark: "", questions: [] };

const num = (s: string) => (s.trim() === "" ? null : Number(s));

function toInput(d: Draft, id?: string): FormInput {
  return {
    id,
    kind: d.kind,
    title: d.title.trim(),
    description: d.description.trim(),
    audience: d.audience,
    clientName: d.audience === "client-staff" && d.clientName ? d.clientName : undefined,
    timeLimitMinutes: num(d.timeLimit),
    passMarkPercent: d.kind === "test" ? num(d.passMark) : null,
    questions: d.questions.map((q) => ({ ...q, prompt: q.prompt.trim(), options: q.options?.map((o) => ({ ...o, label: o.label.trim() })) })),
  };
}

interface Errors {
  title?: string;
  questions?: string;
  client?: string;
  timeLimit?: string;
  passMark?: string;
  q: Record<string, QuestionErrors>;
}

function validate(d: Draft, full: boolean): Errors {
  const e: Errors = { q: {} };
  if (!d.title.trim()) e.title = "Give it a title.";
  if (!full) return e;
  if (d.questions.length === 0) e.questions = "Add at least one question.";
  if (d.audience === "client-staff" && !d.clientName) e.client = "Choose which client's staff will take it.";
  const t = num(d.timeLimit);
  if (t !== null && (!Number.isInteger(t) || t < 1 || t > 480)) e.timeLimit = "Use a whole number of minutes, or leave it blank for no limit.";
  const p = num(d.passMark);
  if (d.kind === "test" && p !== null && (Number.isNaN(p) || p < 0 || p > 100)) e.passMark = "Use a number from 0 to 100, or leave it blank.";
  for (const q of d.questions) {
    const qe: QuestionErrors = {};
    if (!q.prompt.trim()) qe.prompt = "Write the question.";
    if (isChoice(q.type) && !q.optionsSource) {
      const filled = (q.options ?? []).filter((o) => o.label.trim());
      if (filled.length < 2 || filled.length !== (q.options ?? []).length) qe.options = "Choice questions need at least two choices, and none left empty.";
    }
    if (d.kind === "test" && q.marking !== "none" && (q.points === undefined || Number.isNaN(q.points) || q.points < 0)) qe.points = "Enter the points (0 or more).";
    if (Object.keys(qe).length) e.q[q.id] = qe;
  }
  return e;
}

const hasErrors = (e: Errors) => !!(e.title || e.questions || e.client || e.timeLimit || e.passMark || Object.keys(e.q).length);
const LABEL = "mb-1 block text-[13px] font-bold text-(--ap-ink-2)";
const FieldError = ({ text }: { text?: string }) => (text ? <p role="alert" className="mt-1 text-[13px] font-semibold text-(--ap-rose)">{text}</p> : null);

/* ---------------- the builder ---------------- */

function Body({ initial, submissionCount, departments, clients }: { initial: FormDefinition | null; submissionCount: number; departments: string[]; clients: string[] }) {
  const router = useRouter();
  const url = useUrlParams();
  const [meta, setMeta] = useState<{ id: string | null; status: FormStatus; version: number }>({ id: initial?.id ?? null, status: initial?.status ?? "draft", version: initial?.version ?? 1 });
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(toDraft(initial))));
  const [errors, setErrors] = useState<Errors>({ q: {} });
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(() => (url.get("saved") === "created" ? { kind: "ok", text: "Saved as a draft. Nobody can see it until you publish it." } : null));

  const dirty = JSON.stringify(toInput(draft)) !== saved;
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setQuestions = (fn: (qs: FormQuestion[]) => FormQuestion[]) => setDraft((d) => ({ ...d, questions: fn(d.questions) }));
  const isNew = meta.id === null;
  const published = meta.status === "published";

  const setKind = (kind: FormKind) =>
    setDraft((d) => ({ ...d, kind, passMark: kind === "appraisal" ? "" : d.passMark, questions: d.questions.map((q) => normaliseQuestion(q, kind)) }));

  const move = (i: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  const duplicateQ = (i: number) =>
    setQuestions((qs) => {
      const src = qs[i];
      const copy: FormQuestion = { ...JSON.parse(JSON.stringify(src)), id: newId("q"), originalPrompt: undefined };
      copy.options = copy.options?.map((o) => ({ ...o, id: newId(`${copy.id}-o`) }));
      delete copy.answerKey;
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });
  const deleteQ = async (i: number) => {
    const q = draft.questions[i];
    const ok = await confirmAction({ tone: "danger", title: `Delete question ${i + 1}?`, description: q.prompt ? `"${q.prompt}" will be removed from this form.` : "This question will be removed from this form.", confirmLabel: "Delete question" });
    if (ok) setQuestions((qs) => qs.filter((_, k) => k !== i));
  };

  /** Persists the draft. Returns the stored form, or null when validation or the save failed. */
  async function persist(full: boolean): Promise<FormDefinition | null> {
    const e = validate(draft, full);
    setErrors(e);
    if (hasErrors(e)) {
      setNotice({ kind: "error", text: full ? "Please fix the highlighted items first." : "Give it a title first." });
      return null;
    }
    setBusy(true);
    try {
      const f = await saveForm(toInput(draft, meta.id ?? undefined));
      setMeta({ id: f.id, status: f.status, version: f.version });
      setSaved(JSON.stringify(toInput(toDraft(f))));
      return f;
    } catch {
      setNotice({ kind: "error", text: "We could not save. Nothing was changed. Please try again." });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (published) {
      const ok = await confirmAction({
        tone: "caution",
        title: "Save changes to a published form?",
        description: `This saves version ${meta.version + 1}. People who already took it keep their answers against the earlier version, and new people see the updated form.`,
        confirmLabel: "Save new version",
      });
      if (!ok) return;
    }
    const f = await persist(published);
    if (!f) return;
    if (isNew) router.replace(`${formHref(f.id)}?saved=created`);
    else setNotice({ kind: "ok", text: published ? `Saved as version ${f.version}.` : "Draft saved." });
  }

  async function publish() {
    const unconfirmed = draft.kind === "test" ? draft.questions.filter((q) => q.marking === "auto" && q.answerKey?.status !== "confirmed").length : 0;
    const e = validate(draft, true);
    setErrors(e);
    if (hasErrors(e)) {
      setNotice({ kind: "error", text: "Please fix the highlighted items before publishing." });
      return;
    }
    const ok = await confirmAction({
      tone: "caution",
      title: `Publish "${draft.title.trim()}"?`,
      description: `${AUDIENCE_LABEL[draft.audience]}${draft.audience === "client-staff" && draft.clientName ? ` (${draft.clientName})` : ""} will be able to take it straight away.`,
      points: unconfirmed > 0 ? [`${unconfirmed} choice ${unconfirmed === 1 ? "question has" : "questions have"} no confirmed answer key, so ${unconfirmed === 1 ? "it" : "they"} will wait for a person to mark.`] : undefined,
      confirmLabel: "Publish",
    });
    if (!ok) return;
    const f = await persist(true);
    if (!f) return;
    const p = await setFormStatus(f.id, "published");
    setMeta({ id: p.id, status: p.status, version: p.version });
    if (isNew) router.replace(`${formHref(p.id)}?saved=created`);
    setNotice({ kind: "ok", text: "Published. It is now available to take." });
  }

  async function changeStatus(status: FormStatus) {
    if (!meta.id) return;
    const copy = {
      draft: { title: "Unpublish this form?", description: "People will no longer be able to take it. Results already collected stay available.", label: "Unpublish", done: "Unpublished. It is a draft again." },
      archived: { title: "Archive this form?", description: "It moves out of the active list. Results stay available and you can restore it later.", label: "Archive", done: "Archived." },
      published: { title: "Publish this form?", description: "People will be able to take it straight away.", label: "Publish", done: "Published." },
    }[status];
    const ok = await confirmAction({ tone: "caution", title: copy.title, description: copy.description, confirmLabel: copy.label });
    if (!ok) return;
    const f = await setFormStatus(meta.id, status);
    setMeta({ id: f.id, status: f.status, version: f.version });
    setNotice({ kind: "ok", text: copy.done });
  }

  async function duplicate() {
    if (!meta.id) return;
    const f = await duplicateForm(meta.id);
    router.push(`${formHref(f.id)}?saved=created`);
  }

  const qErr = errors.q;

  return (
    <PhoneFormBody className="@container">
      <PhoneFormHead backHref={isNew ? TESTS_HREF : formHref(meta.id as string)} backLabel={isNew ? "tests and forms" : "the test"} title={isNew ? "New test or form" : draft.title.trim() || "Edit test"} />
      {/* Phones: a status row and the sticky bar replace the desktop header card. */}
      <div className="mb-3 flex flex-wrap items-center gap-2 min-[768px]:hidden">
        <KindChip kind={draft.kind} />
        <FormStatusChip status={meta.status} />
        {dirty ? <span className="text-[13px] font-semibold text-(--ap-warn)">Unsaved changes</span> : null}
        <span className="flex-1" />
        {!isNew && submissionCount > 0 ? (
          <Link href={resultsHref(meta.id as string)} className="text-[14px] font-bold text-(--ap-violet)">
            View results
          </Link>
        ) : null}
        {!isNew ? (
          <RowMenu
            label="More actions"
            items={[
              { label: "Duplicate", onSelect: () => void duplicate() },
              ...(published ? [{ label: "Unpublish", onSelect: () => void changeStatus("draft") }] : []),
              ...(meta.status === "archived" ? [{ label: "Restore to draft", onSelect: () => void changeStatus("draft") }] : [{ label: "Archive", tone: "danger" as const, onSelect: () => void changeStatus("archived") }]),
            ]}
          />
        ) : null}
      </div>
      <div className="pf-bar min-[768px]:hidden">
        <button type="button" disabled={busy} onClick={() => void saveDraft()} className="ap-btn ap-btn-s">
          {published ? "Save changes (new version)" : "Save draft"}
        </button>
        {!published ? (
          <button type="button" disabled={busy} onClick={() => void publish()} className="ap-btn ap-btn-p">
            Publish
          </button>
        ) : null}
      </div>
      <div className="max-[767px]:hidden"><BackLink /></div>
      <header className="ap-card mb-4 rounded-[20px] p-5 max-[767px]:hidden min-[768px]:p-6">
        <div className="flex flex-col gap-4 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="min-w-0">
            <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{draft.title.trim() || (isNew ? "New test or form" : "Untitled")}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
              <KindChip kind={draft.kind} />
              <FormStatusChip status={meta.status} />
              {!isNew ? <span>Version {meta.version}</span> : null}
              {!isNew ? <span>{submissionCount} {submissionCount === 1 ? "submission" : "submissions"}</span> : null}
              {dirty ? <span className="font-semibold text-(--ap-warn)">Unsaved changes</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch">
            {!isNew && submissionCount > 0 ? (
              <Link href={resultsHref(meta.id as string)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                View results
              </Link>
            ) : null}
            <button type="button" disabled={busy} onClick={() => void saveDraft()} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
              {published ? "Save changes (new version)" : "Save draft"}
            </button>
            {!published ? (
              <button type="button" disabled={busy} onClick={() => void publish()} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                Publish
              </button>
            ) : null}
            {!isNew ? (
              <RowMenu
                label="More actions"
                items={[
                  { label: "Duplicate", onSelect: () => void duplicate() },
                  ...(published ? [{ label: "Unpublish", onSelect: () => void changeStatus("draft") }] : []),
                  ...(meta.status === "archived" ? [{ label: "Restore to draft", onSelect: () => void changeStatus("draft") }] : [{ label: "Archive", tone: "danger" as const, onSelect: () => void changeStatus("archived") }]),
                ]}
              />
            ) : null}
          </div>
        </div>
      </header>

      {notice ? <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice> : null}

      <div role="group" aria-label="Builder view" className="mb-4 flex gap-2 max-[767px]:hidden @min-[1100px]:hidden">
        {(["edit", "preview"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className="ap-pick">
            {v === "edit" ? "Edit" : "How people see this"}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 @min-[1100px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className={`flex min-w-0 flex-col gap-4 ${view === "preview" ? "hidden @min-[1100px]:flex" : ""}`}>
          <Section title="Details" summary={[draft.title.trim(), draft.kind === "test" ? "Test" : "Appraisal"].filter(Boolean).join(" · ")}>
            <div className="grid gap-4">
              <div className="min-[768px]:order-1">
                <label htmlFor="f-title" className={LABEL}>Title</label>
                <input id="f-title" className="ap-input" value={draft.title} maxLength={120} aria-invalid={!!errors.title || undefined} onChange={(e) => set({ title: e.target.value })} />
                <FieldError text={errors.title} />
              </div>
              <div className="grid gap-4 min-[768px]:order-3 min-[768px]:grid-cols-2">
                <div>
                  <span className={LABEL}>Type</span>
                  <Choice
                    label="Type"
                    value={draft.kind}
                    options={[
                      { value: "test", label: "Test (scored)" },
                      { value: "appraisal", label: "Appraisal (survey, not scored)" },
                    ]}
                    onChange={(v) => setKind(v as FormKind)}
                  />
                </div>
                <div>
                  <span className={LABEL}>Who takes it</span>
                  <Choice
                    label="Who takes it"
                    value={draft.audience}
                    options={(Object.keys(AUDIENCE_LABEL) as FormAudience[]).map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))}
                    onChange={(v) => set({ audience: v as FormAudience })}
                  />
                </div>
              </div>
              {draft.audience === "client-staff" ? (
                <div className="min-[768px]:order-4">
                  <span className={LABEL}>Which client</span>
                  <Choice label="Which client" value={draft.clientName} placeholder="Choose a client" options={clients.map((c) => ({ value: c, label: c }))} onChange={(v) => set({ clientName: v })} invalid={!!errors.client} />
                  <FieldError text={errors.client} />
                </div>
              ) : null}
              <MoreOptions>
              <div className="min-[768px]:order-2">
                <label htmlFor="f-desc" className={LABEL}>Description (shown to people before they start)</label>
                <textarea id="f-desc" className="ap-input" rows={3} value={draft.description} maxLength={500} onChange={(e) => set({ description: e.target.value })} />
              </div>
              <div className="grid gap-4 min-[768px]:order-5 min-[768px]:grid-cols-2">
                <div>
                  <label htmlFor="f-time" className={LABEL}>Time limit in minutes (optional)</label>
                  <input id="f-time" className="ap-input" type="number" inputMode="numeric" min={1} placeholder="No limit" value={draft.timeLimit} aria-invalid={!!errors.timeLimit || undefined} onChange={(e) => set({ timeLimit: e.target.value })} />
                  <FieldError text={errors.timeLimit} />
                </div>
                {draft.kind === "test" ? (
                  <div>
                    <label htmlFor="f-pass" className={LABEL}>Pass mark in percent (optional)</label>
                    <input id="f-pass" className="ap-input" type="number" inputMode="numeric" min={0} max={100} placeholder="Beeliv to confirm" value={draft.passMark} aria-invalid={!!errors.passMark || undefined} onChange={(e) => set({ passMark: e.target.value })} />
                    <FieldError text={errors.passMark} />
                    <p className="mt-1 text-[12px] text-(--ap-muted)">Left blank until Beeliv confirms it. A score only helps a person decide; it never rejects anyone.</p>
                  </div>
                ) : null}
              </div>
              </MoreOptions>
            </div>
          </Section>

          <Section
            title={`Questions (${draft.questions.length})`}
            summary={draft.questions.length ? `${draft.questions.length} question${draft.questions.length === 1 ? "" : "s"}` : "Add your first question"}
            right={
              <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={() => setQuestions((qs) => [...qs, blankQuestion(draft.kind)])}>
                <Plus className="size-4" aria-hidden="true" /> Add a question
              </button>
            }
          >
            {draft.questions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No questions yet"
                description="Add your first question. You can choose how it is answered and, for tests, how many points it is worth."
                action={
                  <button type="button" className="ap-btn ap-btn-p ap-btn-sm text-white!" onClick={() => setQuestions((qs) => [...qs, blankQuestion(draft.kind)])}>
                    <Plus className="size-4" aria-hidden="true" /> Add a question
                  </button>
                }
              />
            ) : (
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {draft.questions.map((q, i) => (
                  <QuestionEditor
                    key={q.id}
                    q={q}
                    index={i}
                    total={draft.questions.length}
                    kind={draft.kind}
                    errors={qErr[q.id]}
                    onChange={(next) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? next : x)))}
                    onMove={(dir) => move(i, dir)}
                    onDuplicate={() => duplicateQ(i)}
                    onDelete={() => void deleteQ(i)}
                  />
                ))}
              </ol>
            )}
            <FieldError text={errors.questions} />
            {draft.questions.length > 0 ? (
              <button type="button" className="ap-btn ap-btn-s ap-btn-sm mt-3" onClick={() => setQuestions((qs) => [...qs, blankQuestion(draft.kind)])}>
                <Plus className="size-4" aria-hidden="true" /> Add a question
              </button>
            ) : null}
          </Section>
        </div>

        <div className={`min-w-0 @min-[1100px]:sticky @min-[1100px]:top-4 ${view === "edit" ? "hidden max-[767px]:block @min-[1100px]:block" : ""}`}>
          <Section title="How people see this" startClosed noNumber summary="Preview" right={<span className="text-[12px] text-(--ap-muted)">Changes in this preview are not saved.</span>}>
            <div className="mb-4">
              <p className="ap-serif text-[18px] leading-tight break-words">{draft.title.trim() || "Untitled"}</p>
              {draft.description.trim() ? <p className="mt-1 text-[14px] break-words text-(--ap-ink-2)">{draft.description.trim()}</p> : null}
              {draft.timeLimit && Number(draft.timeLimit) > 0 ? <p className="mt-1 text-[13px] text-(--ap-muted)">Time limit: {draft.timeLimit} minutes</p> : null}
            </div>
            {draft.questions.length === 0 ? (
              <p className="text-[14px] text-(--ap-muted)">Questions you add will appear here.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {draft.questions.map((q, i) => (
                  <div key={q.id}>
                    <QuestionField
                      question={q}
                      number={i + 1}
                      value={answers[q.id]}
                      onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                      otherValue={other[q.id] ?? ""}
                      onOtherChange={(t) => setOther((o) => ({ ...o, [q.id]: t }))}
                      departments={departments}
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-(--ap-muted)">
        <Link href={TESTS_HREF} className="font-bold text-(--ap-violet)">Back to all tests and forms</Link>
      </p>
    </PhoneFormBody>
  );
}
