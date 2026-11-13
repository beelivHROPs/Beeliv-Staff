"use client";

/**
 * Create / edit an SOP, training course or agreement (HR). Locked template: a
 * DOCUMENT (title, category, version, section body, effective date) with an
 * OPTIONAL PDF attachment and an OPTIONAL video slot (upload or link). Editing
 * a PUBLISHED item saves the next version as a draft; staff keep seeing the
 * live version until it is published. The quiz / assessment engine is a later
 * stage and is not built. Categories, departments, clients, outlets, roles and
 * training types come from the adapter config. Files are not stored in the
 * demo: only the file name and size are kept.
 *
 * Reused: DatePicker (form-fields), SelectMenu, FieldError + useFlagInvalid
 * (form-feedback), PageHeading, EmptyState, ErrorPanel, Section / Restricted
 * (Vacancies parts), ContentStatusChip, AudiencePicker.
 */
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/applicant/form-fields";
import { FieldError, invalidAttrs, useFlagInvalid } from "@/components/applicant/form-feedback";
import { ChevronLeft, Plus, Trash2 } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { BookOpen } from "@/components/staff/icons";
import { Choice, FoldSection, MoreOptions, PhoneFormBody, PhoneFormHead } from "@/components/admin/PhoneForm";
import { createContent, updateContent, useContent, useContentConfig } from "@/lib/admin/sops-training/hooks";
import { ContentValidationError, type Audience, type ContentConfig, type ContentDetail, type ContentInput, type ContentKind, type FieldErrors, type PdfAttachment, type SaveIntent, type SectionInput, type TrainingType, type VideoSlot } from "@/lib/admin/sops-training/types";
import { AudiencePicker } from "./AudiencePicker";
import { contentHref, KIND_WORD, KINDS, listHref, REQUIRED_LABEL, todayYmd } from "./meta";
import { ContentStatusChip, Restricted } from "./parts";

const GRID2 = "grid grid-cols-1 gap-x-5 gap-y-4 min-[700px]:grid-cols-2";
const NO_AUDIENCE: Audience = { allStaff: false, clientIds: [], outletIds: [], roleIds: [], departmentIds: [] };

interface FormState {
  title: string;
  category: string;
  summary: string;
  departmentId: string;
  trainingType: TrainingType;
  durationMinutes: string;
  required: boolean;
  effectiveDate: string;
  dueDate: string;
  sections: SectionInput[];
  pdfUrl: string;
  videoMode: "none" | "link";
  videoUrl: string;
  audience: Audience;
}

let sectionSeq = 0;
const newSection = (): SectionInput => ({ id: `new-s-${Date.now()}-${++sectionSeq}`, title: "", body: "" });

const emptyState = (): FormState => ({ title: "", category: "", summary: "", departmentId: "", trainingType: "course", durationMinutes: "", required: false, effectiveDate: "", dueDate: "", sections: [newSection()], pdfUrl: "", videoMode: "none", videoUrl: "", audience: NO_AUDIENCE });

const fromDetail = (d: ContentDetail): FormState => ({
  title: d.title,
  category: d.category,
  summary: d.summary,
  departmentId: d.departmentId,
  trainingType: d.trainingType,
  durationMinutes: d.durationMinutes ? String(d.durationMinutes) : "",
  required: d.required,
  effectiveDate: d.effectiveDate,
  dueDate: d.dueDate,
  sections: d.sections.length ? d.sections.map((s) => ({ ...s })) : [newSection()],
  pdfUrl: d.pdf?.url ?? "",
  videoMode: d.video?.mode === "link" ? "link" : "none",
  videoUrl: d.video?.mode === "link" ? d.video.url : "",
  audience: d.audience,
});

function toInput(kind: ContentKind, s: FormState): ContentInput {
  const video: VideoSlot | null = s.videoMode === "link" ? { mode: "link", url: s.videoUrl.trim() } : null;
  const pdfLink = s.pdfUrl.trim();
  const pdf: PdfAttachment | null = pdfLink ? { fileName: decodeURIComponent(pdfLink.split("?")[0].split("/").filter(Boolean).pop() ?? "PDF"), sizeBytes: 0, url: pdfLink } : null;
  return { kind, title: s.title, category: s.category, summary: s.summary, departmentId: s.departmentId, trainingType: s.trainingType, durationMinutes: s.durationMinutes, required: s.required, effectiveDate: s.effectiveDate, dueDate: s.dueDate, sections: s.sections, pdf, video, audience: s.audience };
}

function validate(kind: ContentKind, s: FormState, intent: SaveIntent): FieldErrors {
  const f: FieldErrors = {};
  if (!s.title.trim()) f.title = "Enter a title.";
  if (!s.category) f.category = "Choose a category.";
  if (s.sections.some((x) => !x.title.trim() || !x.body.trim())) f.sections = "Every section needs a title and some text.";
  if (s.durationMinutes.trim() && !/^\d{1,4}$/.test(s.durationMinutes.trim())) f.durationMinutes = "Enter whole minutes, for example 30.";
  if (s.videoMode === "link" && !/^https?:\/\/\S+$/i.test(s.videoUrl.trim())) f.video = "Enter a link that starts with http:// or https://.";
  if (s.pdfUrl.trim() && !/^https?:\/\/\S+$/i.test(s.pdfUrl.trim())) f.pdf = "Enter a link that starts with http:// or https://.";
  if (kind !== "training" && intent === "publish" && !s.effectiveDate) f.effectiveDate = "Choose the effective date before publishing.";
  if (intent === "publish") {
    const a = s.audience;
    if (!a.allStaff && !a.clientIds.length && !a.outletIds.length && !a.roleIds.length && !(a.departmentIds ?? []).length) f.audience = "Choose who this is for before publishing.";
  }
  return f;
}

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

export function ContentForm({ contentId }: { contentId?: string }) {
  const params = useSearchParams();
  const rawKind = params.get("kind") ?? "";
  const config = useContentConfig();
  const existing = useContent(contentId ?? "");
  const editing = !!contentId;
  const kind: ContentKind = existing.data?.kind ?? ((KINDS as string[]).includes(rawKind) ? (rawKind as ContentKind) : "sop");
  const back = contentId ? contentHref(contentId) : listHref(kind);
  const title = editing ? `Edit ${KIND_WORD[kind]}` : `New ${KIND_WORD[kind]}`;

  if (config.status === "error" || (editing && existing.status === "error")) {
    return (
      <>
        <BackLink href={back} />
        <PageHeading title={title} />
        <ErrorPanel title="We could not load the form" retry={() => { config.retry(); existing.retry(); }} />
      </>
    );
  }
  if (config.status === "restricted" || (editing && existing.status === "restricted")) {
    return (
      <>
        <BackLink href={back} />
        <PageHeading title={title} />
        <Restricted what="SOPs and training" />
      </>
    );
  }
  if (editing && existing.status === "empty") {
    return (
      <>
        <BackLink href={back} />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={BookOpen} title="We can't find that item" description="It may not exist, or it is outside your scope." />
        </div>
      </>
    );
  }
  if (!config.data || (editing && !existing.data)) return <FormSkeleton title={title} />;
  if (editing && existing.data?.status === "archived") {
    return (
      <>
        <BackLink href={back} />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={BookOpen} title="Archived items can't be edited" description="Restore it as a draft from its page first." />
        </div>
      </>
    );
  }
  if (!config.data.canCreate && !editing) {
    return (
      <>
        <BackLink href={back} />
        <PageHeading title={title} />
        <Restricted what="Creating SOPs and training" />
      </>
    );
  }
  return <FormBody config={config.data} existing={existing.data} kind={kind} back={back} title={title} />;
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
      <ChevronLeft className="size-4" aria-hidden="true" /> Back
    </Link>
  );
}

function FormBody({ config, existing, kind, back, title }: { config: ContentConfig; existing: ContentDetail | null; kind: ContentKind; back: string; title: string }) {
  const router = useRouter();
  const [s, setS] = useState<FormState>(() => (existing ? fromDetail(existing) : emptyState()));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<SaveIntent | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(ref);
  // Phones show ONE link field at a time; both values are kept in the form state.
  const [linkKind, setLinkKind] = useState<"none" | "pdf" | "video">(() => (existing ? (existing.pdf?.url ? "pdf" : existing.video?.mode === "link" ? "video" : "none") : "none"));
  const pickLinkKind = (k: "none" | "pdf" | "video") => {
    setLinkKind(k);
    setS((p) => ({ ...p, videoMode: k === "video" ? "link" : p.videoUrl.trim() ? p.videoMode : "none" }));
  };
  const set =<K extends keyof FormState>(k: K, v: FormState[K]) => setS((p) => ({ ...p, [k]: v }));
  const err = (k: string) => errors[k];
  const bad = (k: string) => invalidAttrs(!!errors[k]);

  const willMakeVersion = existing?.status === "published";
  const canPublish = !existing || existing.allowedActions.includes("publish") || existing.status === "published";
  const nextV = existing ? nextVersion(existing.version) : "v2";
  const publishLabel = willMakeVersion ? `Save and publish ${nextV}` : "Publish";

  async function save(intent: SaveIntent) {
    const found = validate(kind, s, intent);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) {
      flag();
      return;
    }
    setBusy(intent);
    try {
      const d = existing ? await updateContent(existing.id, toInput(kind, s), intent) : await createContent(toInput(kind, s), intent);
      const saved = intent === "publish" ? "published" : willMakeVersion ? "version" : existing ? "updated" : "created";
      router.push(`${contentHref(d.id)}?saved=${saved}`);
    } catch (e) {
      if (e instanceof ContentValidationError) {
        setErrors(e.fields);
        flag();
      } else setFailure("We could not save this. Nothing was changed. Please try again.");
      setBusy(null);
    }
  }

  const moveSection = (i: number, dir: -1 | 1) =>
    setS((p) => {
      const list = [...p.sections];
      const j = i + dir;
      if (j < 0 || j >= list.length) return p;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...p, sections: list };
    });
  const editSection = (i: number, patch: Partial<SectionInput>) => setS((p) => ({ ...p, sections: p.sections.map((x, n) => (n === i ? { ...x, ...patch } : x)) }));
  const sectionWord = kind === "agreement" ? "wording block" : "section";

  return (
    <PhoneFormBody className="max-w-[1000px]">
      <PhoneFormHead backHref={back} backLabel={existing ? "the item" : "the list"} title={title} />
      <div className="max-[767px]:hidden">
        <BackLink href={back} />
        <PageHeading title={title} right={existing ? <ContentStatusChip status={existing.status} /> : <span className="ap-chip ap-chip-mute">New, saved as Draft</span>} />
      </div>

      {existing && willMakeVersion ? (
        <div role="note" className="ap-card mb-4 rounded-2xl p-4 text-[14px] leading-snug text-(--ap-ink-2)">
          <b>This is published.</b> Saving creates {nextV} as a draft; staff keep seeing {existing.version} until you publish {nextV}.
          {kind === "agreement" ? ` Publishing a new agreement version asks everyone who accepted ${existing.version} to accept again.` : ""}
        </div>
      ) : null}

      <form
        ref={ref}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save("save");
        }}
        className="flex flex-col gap-4"
      >
        <FoldSection title="Basics" summary={[s.title.trim(), s.category].filter(Boolean).join(" · ") || "Title and category"}>
          <div className={GRID2}>
            {/* Phone order: title, category, date, then everything else under More options. The min-[768px]:order-N classes keep the desktop order unchanged. */}
            <Field id="cf-title" label="Title" required error={err("title")} className="min-[700px]:col-span-2 min-[768px]:order-1">
              <input id="cf-title" className="ap-input" value={s.title} maxLength={120} onChange={(e) => set("title", e.target.value)} {...bad("title")} aria-describedby={err("title") ? "cf-title-err" : undefined} />
            </Field>
            <Field id="cf-category" label="Category" required error={err("category")} className="min-[768px]:order-2">
              <Choice id="cf-category" label="Category" value={s.category} options={config.categories[kind]} placeholder="Choose a category" onChange={(v) => set("category", v)} invalid={!!err("category")} describedBy={err("category") ? "cf-category-err" : undefined} />
            </Field>
            {kind !== "training" ? (
              <Field id="cf-effective" label="Effective date" required error={err("effectiveDate")} hint={`Required to publish. The version number is set by the system${existing ? `: this is ${existing.version}.` : " (starts at v1)."}`} className="min-[768px]:order-5">
                <DatePicker id="cf-effective" title="Effective date" value={s.effectiveDate} onChange={(v) => set("effectiveDate", v)} invalid={!!err("effectiveDate")} describedBy={err("effectiveDate") ? "cf-effective-err" : undefined} />
              </Field>
            ) : null}
            <MoreOptions>
            {kind === "sop" ? (
              <Field id="cf-dept" label="Department" hint="Optional." className="min-[768px]:order-3">
                <SelectMenu id="cf-dept" value={s.departmentId} options={[{ value: "", label: "Not set" }, ...config.departments.map((d) => ({ value: d.id, label: d.name }))]} placeholder="Not set" onChange={(v) => set("departmentId", v)} />
              </Field>
            ) : null}
            {kind === "training" ? (
              <>
                <Field id="cf-type" label="Format" className="min-[768px]:order-3">
                  <Choice id="cf-type" label="Format" value={s.trainingType} options={config.trainingTypes} onChange={(v) => set("trainingType", v as TrainingType)} />
                </Field>
                <Field id="cf-duration" label="Duration (minutes)" error={err("durationMinutes")} hint="Optional." className="min-[768px]:order-3">
                  <input id="cf-duration" inputMode="numeric" className="ap-input" value={s.durationMinutes} maxLength={4} onChange={(e) => set("durationMinutes", e.target.value)} {...bad("durationMinutes")} aria-describedby={err("durationMinutes") ? "cf-duration-err" : undefined} />
                </Field>
              </>
            ) : null}
            <Field id="cf-summary" label={kind === "training" ? "Purpose" : "Summary"} hint="One or two sentences staff see before they open it." className="min-[700px]:col-span-2 min-[768px]:order-4">
              <textarea id="cf-summary" className="ap-input" rows={3} maxLength={400} value={s.summary} onChange={(e) => set("summary", e.target.value)} />
            </Field>
            {kind !== "agreement" ? (
              <Field id="cf-due" label="Due date" hint="Optional. People still to finish after this date show as overdue." className="min-[768px]:order-6">
                <DatePicker id="cf-due" title="Due date" value={s.dueDate} min={todayYmd()} onChange={(v) => set("dueDate", v)} />
              </Field>
            ) : null}
            <div className="min-[700px]:col-span-2 min-[768px]:order-7">
              <label htmlFor="cf-required" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold text-(--ap-ink)">
                <input id="cf-required" type="checkbox" className="size-4" checked={s.required} onChange={(e) => set("required", e.target.checked)} />
                {REQUIRED_LABEL[kind].field}
              </label>
              {kind === "agreement" ? <p className="text-[13px] text-(--ap-muted)">Who must accept, and what happens if someone does not, needs Beeliv confirmation.</p> : null}
            </div>
            </MoreOptions>
          </div>
        </FoldSection>

        <FoldSection title={kind === "agreement" ? "Agreement wording" : "Content"} summary={`${s.sections.length} ${sectionWord}${s.sections.length === 1 ? "" : "s"}`}>
          {kind === "agreement" ? <p className="mb-3 text-[13px] text-(--ap-muted)">Placeholder wording only. The final legal text needs Beeliv confirmation before an agreement is published.</p> : null}
          <div data-ap-field className="flex flex-col gap-3">
            {s.sections.map((sec, i) => (
              <div key={sec.id} className="rounded-xl border border-(--ap-line-2) p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <b className="min-w-0 flex-1 text-[14px]">
                    {kind === "agreement" ? "Wording block" : "Section"} {i + 1}
                  </b>
                  <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0} aria-label={`Move ${sectionWord} ${i + 1} up`} className="ap-btn ap-btn-s ap-btn-sm h-9 min-w-9 px-2">
                    Up
                  </button>
                  <button type="button" onClick={() => moveSection(i, 1)} disabled={i === s.sections.length - 1} aria-label={`Move ${sectionWord} ${i + 1} down`} className="ap-btn ap-btn-s ap-btn-sm h-9 min-w-9 px-2">
                    Down
                  </button>
                  <button type="button" onClick={() => setS((p) => ({ ...p, sections: p.sections.filter((_, n) => n !== i) }))} disabled={s.sections.length === 1} aria-label={`Remove ${sectionWord} ${i + 1}`} className="ap-btn ap-btn-s ap-btn-sm h-9 min-w-9 px-2">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <input className="ap-input" aria-label={`${sectionWord} ${i + 1} title`} placeholder="Title" value={sec.title} maxLength={120} onChange={(e) => editSection(i, { title: e.target.value })} {...bad("sections")} />
                <textarea className="ap-input mt-2" aria-label={`${sectionWord} ${i + 1} text`} placeholder="Text. Leave a blank line between paragraphs." rows={5} value={sec.body} onChange={(e) => editSection(i, { body: e.target.value })} {...bad("sections")} />
              </div>
            ))}
            <FieldError>{err("sections")}</FieldError>
            <div>
              <button type="button" onClick={() => setS((p) => ({ ...p, sections: [...p.sections, newSection()] }))} className="ap-btn ap-btn-s ap-btn-sm">
                <Plus className="size-4" aria-hidden="true" /> Add {sectionWord}
              </button>
            </div>
          </div>
          {kind === "training" ? <p className="mt-3 text-[13px] text-(--ap-muted)">Quizzes and assessments are a later stage and are not part of this form yet.</p> : null}
        </FoldSection>

        <FoldSection title="Attachments (optional)" summary={s.pdfUrl.trim() && s.videoMode === "link" && s.videoUrl.trim() ? "PDF and video link" : s.pdfUrl.trim() ? "PDF link" : s.videoMode === "link" && s.videoUrl.trim() ? "Video link" : "No link added"}>
          {/* Phones: type pills and ONE link field. */}
          <div className="flex flex-col gap-3 min-[768px]:hidden" data-ap-field>
            <div role="radiogroup" aria-label="Link type" className="flex flex-wrap gap-2">
              {(
                [
                  ["none", "None"],
                  ["pdf", "Document (PDF)"],
                  ["video", "Video"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={linkKind === k} onClick={() => pickLinkKind(k)} className="pf-pill" data-on={linkKind === k ? "" : undefined}>
                  {label}
                </button>
              ))}
            </div>
            {linkKind === "pdf" ? (
              <div>
                <input aria-label="PDF link" className="ap-input" inputMode="url" placeholder="https://" value={s.pdfUrl} onChange={(e) => set("pdfUrl", e.target.value)} {...bad("pdf")} />
                <FieldError>{err("pdf")}</FieldError>
                <p className="mt-1 text-[13px] text-(--ap-muted)">Paste a link to the PDF, for example from Google Drive.</p>
              </div>
            ) : null}
            {linkKind === "video" ? (
              <div>
                <input aria-label="Video link" className="ap-input" inputMode="url" placeholder="https://" value={s.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} {...bad("video")} />
                <FieldError>{err("video")}</FieldError>
                <p className="mt-1 text-[13px] text-(--ap-muted)">Paste a link, for example YouTube or Google Drive.</p>
              </div>
            ) : null}
          </div>
          <div className={`${GRID2} max-[767px]:hidden`}>
            <div className="min-w-0">
              <p className="mb-1.5 text-[14px] font-semibold text-(--ap-ink-2)">PDF</p>
              <input aria-label="PDF link" className="ap-input" placeholder="https://" value={s.pdfUrl} onChange={(e) => set("pdfUrl", e.target.value)} {...bad("pdf")} />
              <FieldError>{err("pdf")}</FieldError>
              <p className="mt-1 text-[13px] text-(--ap-muted)">Paste a link to the PDF (for example from Google Drive). Staff open it from the SOP.</p>
            </div>
            <div className="min-w-0" data-ap-field>
              <p className="mb-1.5 text-[14px] font-semibold text-(--ap-ink-2)">Video</p>
              <SelectMenu
                value={s.videoMode}
                options={[
                  { value: "none", label: "No video" },
                  { value: "link", label: "Link to a video" },
                ]}
                onChange={(v) => set("videoMode", v as FormState["videoMode"])}
                describedBy={err("video") ? "cf-video-err" : undefined}
              />
              {s.videoMode === "link" ? <input aria-label="Video link" className="ap-input mt-2" placeholder="https://" value={s.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} {...bad("video")} /> : null}
              <FieldError id="cf-video-err">{err("video")}</FieldError>
              <p className="mt-1 text-[13px] text-(--ap-muted)">For when a video helps. Paste a link, for example YouTube or Google Drive.</p>
            </div>
          </div>
        </FoldSection>

        <FoldSection title="Audience" summary={audienceSummary(s.audience)}>
          <AudiencePicker idPrefix="cf-aud" value={s.audience} onChange={(a) => set("audience", a)} clients={config.clients} roles={config.roles} departments={config.departments} error={err("audience")} />
        </FoldSection>

        {failure ? (
          <p role="alert" className="ap-card rounded-2xl p-3.5 text-[15px] font-semibold text-(--ap-rose)">
            {failure}
          </p>
        ) : null}

        <div className="pf-bar flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-end">
          <Link href={back} data-pf-cancel="" className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
            Cancel
          </Link>
          <button type="submit" disabled={busy !== null} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
            {busy === "save" ? "Saving..." : existing?.status === "published" ? "Save as new draft version" : existing ? "Save changes" : "Save draft"}
          </button>
          {canPublish ? (
            <button type="button" disabled={busy !== null} onClick={() => void save("publish")} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
              {busy === "publish" ? "Publishing..." : publishLabel}
            </button>
          ) : null}
        </div>
      </form>
    </PhoneFormBody>
  );
}

function audienceSummary(a: Audience): string {
  if (a.allStaff) return "All staff";
  const n = a.clientIds.length + a.outletIds.length + a.roleIds.length + (a.departmentIds ?? []).length;
  return n ? `${n} selected` : "Who must read it";
}

const nextVersion = (v: string) => `v${(Number(v.replace(/\D/g, "")) || 1) + 1}`;

function FormSkeleton({ title }: { title: string }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading form" className="max-w-[1000px]">
      <PageHeading title={title} />
      <div className={`${sk} mb-4 h-[260px]`} />
      <div className={`${sk} mb-4 h-[260px]`} />
      <div className={`${sk} h-[160px]`} />
    </div>
  );
}
