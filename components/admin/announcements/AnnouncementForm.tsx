"use client";

/**
 * Compose / edit an announcement (HR). Fields: title, body, audience (all
 * staff / client / outlet / role, plus an applicants switch that needs Beeliv
 * confirmation), channel (in-app only; email is shown as "needs Beeliv
 * confirmation, not sent in the demo"), publish now or schedule, expiry,
 * pinned, ask for acknowledgement. Clients, outlets and roles come from the
 * adapter config.
 *
 * Reused: DatePicker + TimePicker (form-fields), SelectMenu, FieldError +
 * useFlagInvalid (form-feedback), PageHeading, EmptyState, ErrorPanel,
 * Section / Restricted (Vacancies parts), AudiencePicker (SOPs & Training).
 */
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DatePicker, TimePicker } from "@/components/applicant/form-fields";
import { FieldError, invalidAttrs, useFlagInvalid } from "@/components/applicant/form-feedback";
import { ChevronLeft } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Megaphone } from "@/components/staff/icons";
import { AudiencePicker } from "@/components/admin/sops-training/AudiencePicker";
import { createAnnouncement, updateAnnouncement, useAnnouncement, useAnnouncementConfig } from "@/lib/admin/announcements/hooks";
import { AnnouncementValidationError, type AnnouncementConfig, type AnnouncementDetail, type AnnouncementInput, type FieldErrors, type PublishMode, type SaveIntent } from "@/lib/admin/announcements/types";
import { ANN_BASE, announcementHref, todayYmd } from "./meta";
import { Choice, FoldSection as Section, MoreOptions, PhoneFormBody, PhoneFormHead } from "@/components/admin/PhoneForm";
import { AnnouncementStatusChip, Restricted } from "./parts";

const GRID2 = "grid grid-cols-1 gap-x-5 gap-y-4 min-[700px]:grid-cols-2";

function fromDetail(d: AnnouncementDetail): AnnouncementInput {
  return { title: d.title, body: d.body, audience: d.audience, includeApplicants: d.includeApplicants, requiresAcknowledgement: d.requiresAcknowledgement, pinned: d.pinned, publishMode: d.publishMode, scheduledDate: d.scheduledDate, scheduledTime: d.scheduledTime, expiresOn: d.expiresOn };
}
const EMPTY: AnnouncementInput = { title: "", body: "", audience: { allStaff: false, clientIds: [], outletIds: [], roleIds: [] }, includeApplicants: false, requiresAcknowledgement: false, pinned: false, publishMode: "now", scheduledDate: "", scheduledTime: "09:00", expiresOn: "" };

function validate(s: AnnouncementInput, intent: SaveIntent): FieldErrors {
  const f: FieldErrors = {};
  const today = todayYmd();
  if (!s.title.trim()) f.title = "Enter a title.";
  if (!s.body.trim()) f.body = "Write the announcement.";
  const a = s.audience;
  if (intent === "publish" && !a.allStaff && !a.clientIds.length && !a.outletIds.length && !a.roleIds.length && !s.includeApplicants) f.audience = "Choose who this is for before publishing.";
  if (s.publishMode === "schedule" && intent === "publish") {
    if (!s.scheduledDate) f.scheduledDate = "Choose the date it goes live.";
    else if (s.scheduledDate < today) f.scheduledDate = "Choose today or a later date.";
  }
  const start = s.publishMode === "schedule" && s.scheduledDate ? s.scheduledDate : today;
  if (s.expiresOn && intent === "publish" && s.expiresOn < start) f.expiresOn = "The expiry date must be on or after the day it goes live.";
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

export function AnnouncementForm({ announcementId }: { announcementId?: string }) {
  const config = useAnnouncementConfig();
  const existing = useAnnouncement(announcementId ?? "");
  const editing = !!announcementId;
  const back = announcementId ? announcementHref(announcementId) : ANN_BASE;
  const title = editing ? "Edit announcement" : "New announcement";

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
        <Restricted what="Announcements" />
      </>
    );
  }
  if (editing && existing.status === "empty") {
    return (
      <>
        <BackLink href={back} />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Megaphone} title="We can't find that announcement" description="It may not exist, or it is outside your scope." />
        </div>
      </>
    );
  }
  if (!config.data || (editing && !existing.data)) return <FormSkeleton title={title} />;
  if (!config.data.canCreate && !editing) {
    return (
      <>
        <BackLink href={back} />
        <PageHeading title={title} />
        <Restricted what="Creating announcements" />
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

function FormBody({ config, existing, back, title }: { config: AnnouncementConfig; existing: AnnouncementDetail | null; back: string; title: string }) {
  const router = useRouter();
  const [s, setS] = useState<AnnouncementInput>(() => (existing ? fromDetail(existing) : EMPTY));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<SaveIntent | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(ref);
  const set = <K extends keyof AnnouncementInput>(k: K, v: AnnouncementInput[K]) => setS((p) => ({ ...p, [k]: v }));
  const err = (k: string) => errors[k];
  const bad = (k: string) => invalidAttrs(!!errors[k]);
  const isDraft = !existing || existing.status === "draft";

  async function save(intent: SaveIntent) {
    const found = validate(s, intent);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) {
      flag();
      return;
    }
    setBusy(intent);
    try {
      const d = existing ? await updateAnnouncement(existing.id, s, intent) : await createAnnouncement(s, intent);
      router.push(`${announcementHref(d.id)}?saved=${intent === "publish" ? "published" : existing ? "updated" : "draft"}`);
    } catch (e) {
      if (e instanceof AnnouncementValidationError) {
        setErrors(e.fields);
        flag();
      } else setFailure("We could not save this. Nothing was changed. Please try again.");
      setBusy(null);
    }
  }

  return (
    <PhoneFormBody className="max-w-[1000px]">
      <PhoneFormHead backHref={back} backLabel={existing ? "the announcement" : "announcements"} title={title} />
      <div className="max-[767px]:hidden">
        <BackLink href={back} />
        <PageHeading title={title} right={existing ? <AnnouncementStatusChip status={existing.status} /> : <span className="ap-chip ap-chip-mute">New, saved as Draft</span>} />
      </div>

      {existing && !isDraft ? (
        <div role="note" className="ap-card mb-4 rounded-2xl p-4 text-[14px] leading-snug text-(--ap-ink-2)">
          <b>This announcement is {existing.status === "scheduled" ? "scheduled" : existing.status}.</b> Changes you save show to staff straight away{existing.status === "expired" ? " only if you republish it" : ""} and are added to the activity log.
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
        <Section title="Message" summary={s.title.trim() || "Title and text"}>
          <div className="flex flex-col gap-4">
            <Field id="af-title" label="Title" required error={err("title")}>
              <input id="af-title" className="ap-input" value={s.title} maxLength={120} onChange={(e) => set("title", e.target.value)} {...bad("title")} aria-describedby={err("title") ? "af-title-err" : undefined} />
            </Field>
            <Field id="af-body" label="Announcement" required error={err("body")} hint="Staff see the first two lines on their Home screen.">
              <textarea id="af-body" className="ap-input" rows={6} maxLength={1500} value={s.body} onChange={(e) => set("body", e.target.value)} {...bad("body")} aria-describedby={err("body") ? "af-body-err" : undefined} />
            </Field>
          </div>
        </Section>

        <Section title="Audience" summary={s.audience.allStaff ? "All staff" : s.audience.clientIds.length + s.audience.outletIds.length + s.audience.roleIds.length ? `${s.audience.clientIds.length + s.audience.outletIds.length + s.audience.roleIds.length} selected` : "Who should see it"}>
          <AudiencePicker
            idPrefix="af-aud"
            value={s.audience}
            onChange={(a) => set("audience", a)}
            clients={config.clients}
            roles={config.roles}
            error={err("audience")}
            extra={
              <div className="mt-3">
                <label htmlFor="af-applicants" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold text-(--ap-ink)">
                  <input id="af-applicants" type="checkbox" className="size-4" checked={s.includeApplicants} onChange={(e) => set("includeApplicants", e.target.checked)} />
                  Also show to applicants
                </label>
                <p className="text-[13px] text-(--ap-muted)">Whether announcements may reach applicants needs Beeliv confirmation. Leave off unless confirmed.</p>
              </div>
            }
          />
        </Section>

        <Section title="Channel and timing" summary={s.publishMode === "schedule" ? "Scheduled" : "Publish now"}>
          <div className={GRID2}>
            <Field id="af-mode" label="When should it go live?" className="min-[768px]:order-2">
              <Choice
                id="af-mode"
                label="When should it go live?"
                value={s.publishMode}
                options={[
                  { value: "now", label: "Publish now" },
                  { value: "schedule", label: "Schedule for a date" },
                ]}
                onChange={(v) => set("publishMode", v as PublishMode)}
              />
            </Field>
            {s.publishMode === "schedule" ? (
              <>
                <Field id="af-date" label="Goes live on" required error={err("scheduledDate")} className="min-[768px]:order-3">
                  <DatePicker id="af-date" title="Goes live on" value={s.scheduledDate} min={todayYmd()} onChange={(v) => set("scheduledDate", v)} invalid={!!err("scheduledDate")} describedBy={err("scheduledDate") ? "af-date-err" : undefined} />
                </Field>
                <Field id="af-time" label="At" className="min-[768px]:order-4">
                  <TimePicker id="af-time" value={s.scheduledTime} from="06:00" to="21:00" onChange={(v) => set("scheduledTime", v)} />
                </Field>
              </>
            ) : null}
            <MoreOptions>
            <div className="min-w-0 min-[768px]:order-1">
              <p className="mb-1.5 text-[14px] font-semibold text-(--ap-ink-2)">Channel</p>
              <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-(--ap-ink)">
                <input type="checkbox" className="size-4" checked disabled readOnly /> In-app (Staff Home)
              </label>
              <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-(--ap-muted)">
                <input type="checkbox" className="size-4" checked={false} disabled readOnly /> Email
              </label>
              <p className="text-[13px] text-(--ap-muted)">Email needs Beeliv confirmation and is not sent in the demo.</p>
            </div>
            <Field id="af-expires" label="Expires on" error={err("expiresOn")} hint="Optional. It stops showing to staff after this date." className="min-[768px]:order-5">
              <DatePicker id="af-expires" title="Expires on" value={s.expiresOn} min={todayYmd()} onChange={(v) => set("expiresOn", v)} invalid={!!err("expiresOn")} describedBy={err("expiresOn") ? "af-expires-err" : undefined} />
            </Field>
            <div className="min-w-0 min-[768px]:order-6">
              <label htmlFor="af-pinned" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold text-(--ap-ink)">
                <input id="af-pinned" type="checkbox" className="size-4" checked={s.pinned} onChange={(e) => set("pinned", e.target.checked)} /> Pin to the top
              </label>
              <label htmlFor="af-ack" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold text-(--ap-ink)">
                <input id="af-ack" type="checkbox" className="size-4" checked={s.requiresAcknowledgement} onChange={(e) => set("requiresAcknowledgement", e.target.checked)} /> Ask staff to acknowledge it
              </label>
            </div>
            </MoreOptions>
          </div>
        </Section>

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
            {busy === "save" ? "Saving..." : isDraft && !existing ? "Save draft" : "Save changes"}
          </button>
          {isDraft ? (
            <button type="button" disabled={busy !== null} onClick={() => void save("publish")} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
              {busy === "publish" ? "Publishing..." : s.publishMode === "schedule" ? "Schedule" : "Publish"}
            </button>
          ) : null}
        </div>
      </form>
    </PhoneFormBody>
  );
}

function FormSkeleton({ title }: { title: string }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading form" className="max-w-[1000px]">
      <PageHeading title={title} />
      <div className={`${sk} mb-4 h-[260px]`} />
      <div className={`${sk} mb-4 h-[160px]`} />
      <div className={`${sk} h-[200px]`} />
    </div>
  );
}
