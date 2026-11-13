"use client";

/**
 * Applicant 360 (spec 28.2). Header + permission-aware actions, eight tabs,
 * and a side column (Next Required Action + progress rail). Layout reflows by
 * the container width: side column beside the tabs when wide, above them when
 * not; the tab bar wraps (pills) or becomes a dropdown on phones, so nothing
 * scrolls sideways or clips.
 *
 * Hiding an action is presentation only: the capability flags come from the
 * adapter, and the backend must re-check every action and write the audit
 * history record. HR has no Approve-as-Staff action: only "Submit for approval".
 * The Head of Operations never "submits": where a selection decision is due it
 * sees "Approve selection" and "Decline" instead (capabilities come from the adapter).
 */
import Link from "next/link";
import { useId, useState } from "react";
import { ChevronLeft, Mail, Phone, Users } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { FilterDropdown } from "@/components/applicant/FilterTabs";
import { EmptyState, DETAIL_TITLE } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { playAdminSound } from "@/lib/admin/sound";
import { formatDateShort } from "@/lib/applicant/time";
import { addApplicantNote, performApplicantAction, useApplicant } from "@/lib/admin/applicants/hooks";
import type { ApplicantDetail, RecruitmentAction } from "@/lib/admin/applicants/types";
import { NoteSheet, type NoteSheetConfig } from "./NoteSheet";
import { ActivityPanel, ApplicationPanel, DocumentsPanel, InterviewsPanel, NotesPanel, OverviewPanel, ScreeningPanel } from "./Panels";
import { InitialsAvatar, StageChip, StageMark, StagePill } from "./parts";
import { COVER_ROUND, PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction, initialsOf } from "@/components/admin/PhoneDetail";
import { ActionsMenu } from "./ActionsMenu";
import { NextActionBox, ProgressRail } from "./Rail";
import { useUrlParams } from "./url";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "application", label: "Application" },
  { key: "documents", label: "Documents" },
  { key: "interviews", label: "Interviews" },
  { key: "notes", label: "Notes" },
  { key: "history", label: "History" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
/** Older links: Screening now sits in Application, Assessments in Interviews, Activity is History. */
const LEGACY_TAB: Record<string, TabKey> = { screening: "application", assessments: "interviews", activity: "history" };

const SHEETS: Partial<Record<RecruitmentAction, NoteSheetConfig>> = {
  hold: { title: "Put this application on hold", description: "The application is kept, not rejected. A note is required.", label: "Reason for the hold", confirmLabel: "Put on hold", tone: "neutral" },
  reject: { title: "Reject this application", description: "The record is retained for history. A note is required.", label: "Reason for rejecting", confirmLabel: "Reject application", tone: "danger" },
  "talent-pool": { title: "Move to Talent Pool", description: "They stay on record and can be matched to future roles. Their application and history are kept. The vacancy they applied for is saved as the source.", label: "Note (optional)", confirmLabel: "Move to Talent Pool", tone: "neutral", noteOptional: true },
  "request-info": { title: "Request more information", description: "Describe what is needed from the applicant.", label: "What do you need?", confirmLabel: "Send request", tone: "neutral" },
};

export function ApplicantDetailView({ id }: { id: string }) {
  const live = useApplicant(id);
  const url = useUrlParams();
  const [sheet, setSheet] = useState<RecruitmentAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabId = useId();

  if (live.status === "error" || live.status === "restricted") {
    return (
      <>
        <Back />
        <ErrorPanel title={live.status === "restricted" ? "This applicant is not available for this account" : "We could not load this applicant"} retry={live.retry} />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Users} title="Applicant not found" description="This applicant does not exist or is outside your assigned clients and outlets." />
        </div>
      </>
    );
  }
  const a = live.data;
  if (!a) return <DetailSkeleton />;

  const rawTab = url.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : LEGACY_TAB[rawTab] ?? "overview";

  async function run(action: RecruitmentAction, note?: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      live.setData(await performApplicantAction(id, { action, note }));
      // Sound only after the adapter confirmed (the page already shows the new stage).
      playAdminSound(action === "shortlist" || action === "submit-for-approval" || action === "approve-selection" ? "approved" : action === "reject" ? "rejected" : "saved");
      return true;
    } catch {
      setError("That action could not be completed. Nothing was changed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onAction(action: RecruitmentAction) {
    if (SHEETS[action]) {
      setError(null);
      setSheet(action);
      return;
    }
    if (action === "approve-selection") {
      const ok = await confirmAction({
        tone: "neutral",
        title: `Approve this selection for ${a?.name ?? "this applicant"}?`,
        description: "HR can then continue with the next step for this applicant.",
        points: ["Your decision is recorded with your name and the time.", "It cannot be changed here once saved."],
        confirmLabel: "Approve selection",
      });
      if (ok) await run(action);
      return;
    }
    const isShortlist = action === "shortlist";
    const ok = await confirmAction({
      tone: "neutral",
      title: isShortlist ? "Shortlist this applicant?" : "Submit for approval?",
      description: isShortlist ? "They move to the shortlist. The change is recorded in their activity history." : "The selection goes to Operations. Final approval is theirs; you cannot approve it.",
      confirmLabel: isShortlist ? "Shortlist" : "Submit for approval",
    });
    if (ok) await run(action);
  }

  async function addNote(body: string) {
    live.setData(await addApplicantNote(id, body));
  }

  const panel = {
    overview: <OverviewPanel a={a} />,
    application: (
      <div className="flex flex-col gap-4">
        <ApplicationPanel a={a} />
        <ScreeningPanel a={a} />
      </div>
    ),
    documents: <DocumentsPanel a={a} />,
    interviews: (
      <div className="flex flex-col gap-4">
        <InterviewsPanel a={a} kind="interview" />
        <InterviewsPanel a={a} kind="assessment" />
      </div>
    ),
    notes: <NotesPanel a={a} onAdd={addNote} />,
    history: <ActivityPanel a={a} />,
  }[tab];

  const setTab = (k: TabKey) => url.set({ tab: k === "overview" ? undefined : k });

  return (
    <div>
      <Back />
      <Header a={a} busy={busy} error={error} onAction={onAction} />

      {/* Phones: the rest of the record (progress, every section) sits behind one tappable row. */}
      <PhoneMore title="More details">
      <div className="mb-3 rounded-2xl border border-(--ap-line) bg-(--ap-surface) p-4 min-[768px]:hidden">
        <ProgressRail a={a} />
      </div>
      <div className="@container">
        <div className="min-w-0">
          <div className="min-w-0">
            {/* Tabs: wrapping pills from tablet up, a dropdown on phones. */}
            <div className="mb-4 max-[767px]:mb-3">
              <div role="tablist" aria-label="Applicant sections" className="hidden flex-wrap gap-1 rounded-xl border border-(--ap-line) bg-(--ap-surface) p-1 min-[768px]:flex">
                {TABS.map((t) => {
                  const on = t.key === tab;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      id={`${tabId}-${t.key}`}
                      aria-selected={on}
                      aria-controls={`${tabId}-panel`}
                      onClick={() => setTab(t.key)}
                      className={`inline-flex h-10 items-center rounded-[9px] px-3.5 text-[15px] font-bold whitespace-nowrap transition-colors ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-muted) hover:bg-(--ap-tint) hover:text-(--ap-ink)"}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="min-[768px]:hidden">
                <FilterDropdown label="Applicant section" prefix="Section" options={TABS.map((t) => ({ key: t.key, label: t.label }))} current={TABS.find((t) => t.key === tab) ?? TABS[0]} onChange={setTab} />
              </div>
            </div>
            <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`}>
              {panel}
            </div>
          </div>
        </div>
      </div>
      </PhoneMore>

      {sheet && SHEETS[sheet] ? (
        <NoteSheet
          config={SHEETS[sheet]}
          busy={busy}
          error={error}
          onCancel={() => setSheet(null)}
          onSubmit={async (note) => {
            if (await run(sheet, note)) {
              setSheet(null);
              // After a Reject, offer to keep the person for future roles (explicitly asked, never automatic).
              if (sheet === "reject") {
                const keep = await confirmAction({
                  tone: "neutral",
                  title: "Add to Talent Pool?",
                  description: "This applicant was not selected. You can keep them for future roles. Their record and history stay either way.",
                  confirmLabel: "Add to Talent Pool",
                  cancelLabel: "Not now",
                });
                if (keep) await run("talent-pool");
              }
            }
          }}
        />
      ) : null}
    </div>
  );
}

function Back() {
  return (
    <Link href="/admin/recruitment/applicants" className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[15px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Applicants
    </Link>
  );
}

function Header({ a, busy, error, onAction }: { a: ApplicantDetail; busy: boolean; error: string | null; onAction: (x: RecruitmentAction) => void }) {
  const c = a.capabilities;
  const hasActions = c.canShortlist || c.canSubmitForApproval || c.canApproveSelection || c.canHold || c.canReject || c.canRequestInfo || c.canMoveToTalentPool;
  const approver = c.canApproveSelection;
  const primary = c.canShortlist ? { label: "Shortlist", action: "shortlist" as const } : c.canSubmitForApproval ? { label: "Submit for approval", action: "submit-for-approval" as const } : approver ? { label: "Approve selection", action: "approve-selection" as const } : null;
  const menuItems = [
    ...(c.canRequestInfo ? [{ label: "Request more information", onSelect: () => onAction("request-info") }] : []),
    ...(c.canHold ? [{ label: "Put on hold", onSelect: () => onAction("hold") }] : []),
    ...(c.canMoveToTalentPool ? [{ label: "Move to Talent Pool", onSelect: () => onAction("talent-pool") }] : []),
    ...(c.canReject ? [{ label: approver ? "Decline" : "Reject", tone: "danger" as const, onSelect: () => onAction("reject") }] : []),
  ];
  return (
    <>
    {/* Phones: cover, one status, Call / Email, a short counted list, ONE sticky primary action. */}
    <PhoneDetailHead
      backHref="/admin/recruitment/applicants"
      backLabel="Applicants"
      visual={{ kind: "initials", text: initialsOf(a.name) }}
      title={a.name}
      status={<StagePill row={a} />}
      line={`${a.location} · Applied ${formatDateShort(a.appliedAt)}`}
      actions={
        <>
          <PhoneAction href={`tel:${a.phone.replace(/\s+/g, "")}`} label="Call" icon={<Phone className="size-4" aria-hidden="true" />} />
          <PhoneAction href={`mailto:${a.email}`} label="Email" icon={<Mail className="size-4" aria-hidden="true" />} />
        </>
      }
      menu={<ActionsMenu quiet alignEnd label="More actions" disabled={busy} triggerClassName={COVER_ROUND} items={menuItems} />}
    />
    <div className="min-[768px]:hidden">
      <PhoneFacts
        title="Application"
        rows={[
          { label: "Role", value: a.vacancy },
          { label: "Client", value: `${a.client} (${a.outlet})` },
          { label: "Next step", value: a.nextRequired.title },
          { label: "Recruiter", value: a.recruiter?.name ?? "Unassigned" },
          { label: "Expected salary", value: a.expectedSalary.allowed ? a.expectedSalary.value : null },
        ]}
      />
      {error ? (
        <p role="alert" className="mt-2 text-[15px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </div>
    {primary ? (
      <PhoneStickyAction>
        <button type="button" disabled={busy} onClick={() => onAction(primary.action)} className={PD_CTA}>
          {primary.label}
        </button>
      </PhoneStickyAction>
    ) : null}
    <header className={`${CARD} mb-4 max-[767px]:hidden min-[768px]:@container`}>
      {hasActions ? <span data-admin-detail="" hidden /> : null}
      <div className="flex flex-col gap-5 max-[767px]:gap-3 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
        <div className="flex min-w-0 items-start gap-4 max-[767px]:gap-3">
          <span className="shrink-0 min-[768px]:hidden"><InitialsAvatar name={a.name} size={56} /></span>
          <span className="max-[767px]:hidden"><InitialsAvatar name={a.name} size={64} /></span>
          <div className="min-w-0">
            <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{a.name}</h1>
            <p className="mt-1 text-[14px] break-all text-(--ap-muted) max-[767px]:hidden">{a.reference}</p>
            <p className="mt-2 text-[15px] leading-snug break-words max-[767px]:mt-1 max-[767px]:text-[14px]">
              <b>{a.vacancy}</b>, {a.client} ({a.outlet})
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-(--ap-ink-2) max-[767px]:mt-2 max-[767px]:gap-x-3 max-[767px]:text-[13px]">
              <span className="ad-dtable inline-flex"><StageMark row={a} /></span>
              <span>Recruiter: {a.recruiter?.name ?? "Unassigned"}</span>
              <span className="max-[767px]:hidden">Applied {formatDateShort(a.appliedAt)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-(--ap-muted) max-[767px]:hidden">
              <span className="inline-flex items-center gap-1.5 break-all">
                <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {a.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" aria-hidden="true" /> {a.phone}
              </span>
            </div>
          </div>
        </div>

        {hasActions ? (
          <div className="flex flex-col gap-2.5 min-[1100px]:max-w-[420px] min-[1100px]:items-end">
            <div className="flex flex-wrap items-center gap-2.5 max-[767px]:flex-nowrap max-[767px]:[&>button:not(:last-child)]:flex-1 min-[1100px]:justify-end">
              {c.canShortlist ? (
                <button type="button" disabled={busy} onClick={() => onAction("shortlist")} className="ap-btn ap-btn-p h-12 px-6 text-[15px] font-semibold text-white! max-[767px]:h-11 max-[767px]:px-5 max-[767px]:text-[14px]">
                  Shortlist
                </button>
              ) : null}
              {c.canSubmitForApproval ? (
                <button type="button" disabled={busy} onClick={() => onAction("submit-for-approval")} className="ap-btn ap-btn-p h-12 px-6 text-[15px] font-semibold text-white! max-[767px]:h-11 max-[767px]:px-5 max-[767px]:text-[14px]">
                  Submit for approval
                </button>
              ) : null}
              {c.canApproveSelection ? (
                <>
                  <button type="button" disabled={busy} onClick={() => onAction("approve-selection")} className="ap-btn ap-btn-p h-12 px-6 text-[15px] font-semibold text-white! max-[767px]:h-11 max-[767px]:px-5 max-[767px]:text-[14px]">
                    Approve selection
                  </button>
                  <button type="button" disabled={busy} onClick={() => onAction("reject")} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold max-[767px]:h-11 max-[767px]:text-[14px]">
                    Decline
                  </button>
                </>
              ) : null}
              <ActionsMenu
                quiet
                disabled={busy}
                items={[
                  ...(c.canRequestInfo ? [{ label: "Request more information", onSelect: () => onAction("request-info") }] : []),
                  ...(c.canHold ? [{ label: "Put on hold", onSelect: () => onAction("hold") }] : []),
                  ...(c.canMoveToTalentPool ? [{ label: "Move to Talent Pool", onSelect: () => onAction("talent-pool") }] : []),
                  ...(c.canReject && !c.canApproveSelection ? [{ label: "Reject", tone: "danger" as const, onSelect: () => onAction("reject") }] : []),
                ]}
              />
            </div>
            {error ? (
              <p role="alert" className="text-[15px] font-semibold text-(--ap-rose)">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-(--ap-line-2) pt-4 max-[767px]:mt-3 max-[767px]:gap-y-3 max-[767px]:pt-3 @min-[760px]:grid-cols-2">
        <NextActionBox a={a} />
        <ProgressRail a={a} />
      </div>
    </header>
    </>
  );
}

function DetailSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading applicant">
      <h1 className="sr-only">Applicant</h1>
      <div className={`${sk} mb-3 h-6 w-28`} />
      <div className={`${sk} mb-4 h-[170px] w-full`} />
      <div className="grid grid-cols-1 gap-4 min-[1280px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className={`${sk} h-11 w-full`} />
          <div className={`${sk} h-[260px] w-full`} />
        </div>
        <div className={`${sk} h-[300px] w-full`} />
      </div>
    </div>
  );
}
