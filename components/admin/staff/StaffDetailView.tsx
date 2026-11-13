"use client";

/**
 * Staff record (spec 28.3), one three-level hierarchy on desktop and phone:
 *   LEVEL 1  identity (always visible): avatar, name, ONE status, role and place, Call / Email, ONE primary action.
 *   LEVEL 2  "At a glance": up to four cards (Attendance, Leave, Training and SOPs, Documents); each opens its section.
 *   LEVEL 3  detail: desktop = pill tabs (Overview first); phone = the same sections as folded rows, one open at a time.
 * Sensitive identity / banking / next of kin appear only as masked placeholders (spec 29.4). Hiding a tab or button
 * is presentation only: the backend re-checks scope on every read.
 * Docs: docs/design-references/admin-staff-detail-2026-10-27.md.
 */
import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { COVER_ROUND, PD_CTA, PhoneAction, PhoneDetailHead, PhoneStickyAction, initialsOf } from "@/components/admin/PhoneDetail";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { Award, CalendarCheck, ChevronDown, ChevronLeft, FileCheck2, Mail, Phone, Sun, Users } from "@/components/applicant/icons";
import { useIsPhone } from "@/components/applicant/motion";
import { EmptyState, DETAIL_TITLE } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { ShieldAlert } from "@/components/client/icons";
import { useStaffMember } from "@/lib/admin/staff/hooks";
import type { StaffDetail } from "@/lib/admin/staff/types";
import { useStaffLeaveHistory } from "@/lib/admin/workforce/hooks";
import { formatDateShort } from "@/lib/applicant/time";
import { AdminState, reassignHref, STAFF_DIRECTORY_HREF, useUrlParams } from "./parts";
import { GlanceCard, Pill, StateChip, StatePhonePill, isAwaiting, metricsOf, stateOf } from "./detail-kit";
import { AgreementsPanel, AttendancePanel, DocumentsPanel, HistoryPanel, LeavePanel, nextShiftOf, OverviewPanel, SchedulePanel, TrainingPanel, WarningsPanel, type TabKey } from "./StaffPanels";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "attendance", label: "Attendance" },
  { key: "schedule", label: "Schedule" },
  { key: "leave", label: "Leave" },
  { key: "training", label: "Training and SOPs" },
  { key: "documents", label: "Documents" },
  { key: "agreements", label: "Agreements" },
  { key: "warnings", label: "Warnings" },
  { key: "history", label: "History" },
];
/** Links made before the tabs were regrouped still land somewhere sensible. */
const LEGACY: Record<string, TabKey> = { assignment: "history", recruitment: "history", activity: "history" };
const asTab = (v: string): TabKey => (TABS.some((t) => t.key === v) ? (v as TabKey) : (LEGACY[v] ?? "overview"));

export function StaffDetailView({ id }: { id: string }) {
  const live = useStaffMember(id);
  const url = useUrlParams();
  const tabId = useId();

  return (
    <AdminState status={live.status === "empty" ? "ready" : live.status} title="Staff record" what="this staff record" retry={live.retry}>
      <Back />
      {live.status === "empty" || !live.data ? (
        <div className={`${CARD} p-6 min-[768px]:p-8`}>
          <EmptyState icon={Users} title="Staff record not found" description="This person does not exist or is outside your assigned clients and outlets." />
        </div>
      ) : (
        <Body s={live.data} tab={asTab(url.get("tab"))} setTab={(k) => url.set({ tab: k === "overview" ? undefined : k })} tabId={tabId} />
      )}
    </AdminState>
  );
}

function Back() {
  return (
    <Link href={STAFF_DIRECTORY_HREF} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Staff Directory
    </Link>
  );
}

function Body({ s, tab, setTab, tabId }: { s: StaffDetail; tab: TabKey; setTab: (k: TabKey) => void; tabId: string }) {
  const phone = useIsPhone();
  const leave = useStaffLeaveHistory(s.id);
  const [openKey, setOpenKey] = useState<TabKey | null>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  const state = stateOf(s);
  const awaiting = isAwaiting(s);
  const m = metricsOf(s);
  const roleLine = [s.role, s.department].filter(Boolean).join(" · ");
  const placeLine = awaiting ? "Not placed with a client yet" : [s.client, s.outlet].filter(Boolean).join(" · ");
  const primaryLabel = awaiting ? "Assign" : "Reassign";

  /** Opens a section from a card, a chip or a menu, and brings it into view. */
  const open = (k: TabKey) => {
    if (phone) setOpenKey(k);
    else setTab(k);
    window.setTimeout(() => sectionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  const hl = leave.data;
  const lv: { value: ReactNode; unit?: string; caption: string } | null =
    m.leave.pendingDays > 0
      ? { value: m.leave.pendingDays, unit: m.leave.pendingDays === 1 ? "day" : "days", caption: hl?.balance ? `pending approval · ${hl.balance.remaining} ${hl.balance.unit} left` : "pending approval" }
      : hl?.balance
        ? { value: hl.balance.remaining, unit: hl.balance.unit, caption: "leave balance" }
        : hl && hl.takenThisYear > 0
          ? { value: hl.takenThisYear, unit: hl.takenThisYear === 1 ? "day" : "days", caption: "taken this year" }
          : null;

  const nMissing = s.documents.filter((d) => d.state === "missing").length;
  const nRejected = s.documents.filter((d) => d.state === "rejected").length;
  const docIssues = m.docs.broken > 0 ? [nMissing ? `${nMissing} missing` : "", nRejected ? `${nRejected} rejected` : ""].filter(Boolean).join(", ") : m.docs.review > 0 ? `${m.docs.review} to review` : null;

  /* LEVEL 2: a card only when its data exists. */
  const glance = [
    s.attendance.length > 0 && m.att.pct !== null ? (
      <GlanceCard key="att" icon={CalendarCheck} tile="bg-[#2f9e5b]" title="Attendance" value={`${m.att.pct}%`} caption={`on time, last ${m.att.counted} ${m.att.counted === 1 ? "shift" : "shifts"}`} progress={m.att.pct / 100} label={`Attendance, ${m.att.pct}% on time. Open attendance`} onClick={() => open("attendance")} />
    ) : null,
    lv ? <GlanceCard key="leave" icon={Sun} tile="bg-[#7a5cb0]" title="Leave" value={lv.value} unit={lv.unit} caption={lv.caption} label={`Leave, ${lv.value} ${lv.unit ?? ""} ${lv.caption}. Open leave`} onClick={() => open("leave")} /> : null,
    m.training.total > 0 ? (
      <GlanceCard
        key="train"
        icon={Award}
        tile="bg-[#c98a1b]"
        title="Training and SOPs"
        value={m.training.done}
        unit={`of ${m.training.total}`}
        caption="completed"
        progress={m.training.done / m.training.total}
        tone={m.training.notYet > 0 ? "warn" : "normal"}
        chip={m.training.notYet > 0 ? `${m.training.notYet} not yet done` : null}
        label={`Training and SOPs, ${m.training.done} of ${m.training.total} completed. Open training`}
        onClick={() => open("training")}
      />
    ) : null,
    m.docs.total > 0 ? (
      <GlanceCard
        key="docs"
        icon={FileCheck2}
        tile="bg-[#5b8fd0]"
        title="Documents"
        value={m.docs.valid}
        unit={`of ${m.docs.total}`}
        caption="valid"
        progress={m.docs.valid / m.docs.total}
        tone={m.docs.broken > 0 ? "bad" : m.docs.review > 0 ? "warn" : "normal"}
        chip={docIssues}
        label={`Documents, ${m.docs.valid} of ${m.docs.total} valid. Open documents`}
        onClick={() => open("documents")}
      />
    ) : null,
  ].filter(Boolean);

  const warningsChip =
    s.warnings.length > 0 ? (
      <button
        type="button"
        onClick={() => open("warnings")}
        aria-label={`${s.warnings.length} ${s.warnings.length === 1 ? "warning" : "warnings"} on record. Open warnings`}
        className="inline-flex items-center gap-1 rounded-full bg-[#fde8ea] px-2.5 py-1 text-[12px] leading-none font-bold text-[#b4232c] focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none [html[data-admin-theme=dark]_&]:bg-[#36172a] [html[data-admin-theme=dark]_&]:text-[#f4a9c6]"
      >
        <ShieldAlert className="size-3.5" aria-hidden="true" /> Warnings {s.warnings.length}
      </button>
    ) : null;

  const menuItems = [
    { label: "View documents", onSelect: () => open("documents") },
    { label: "View leave", onSelect: () => open("leave") },
    { label: "View history", onSelect: () => open("history") },
  ];
  const callHref = `tel:${s.phone.replace(/\s+/g, "")}`;

  const panels: Record<TabKey, ReactNode> = {
    overview: <OverviewPanel s={s} goTab={open} />,
    attendance: <AttendancePanel s={s} />,
    schedule: <SchedulePanel s={s} />,
    leave: <LeavePanel live={leave} />,
    training: <TrainingPanel s={s} />,
    documents: <DocumentsPanel s={s} />,
    agreements: <AgreementsPanel s={s} />,
    warnings: <WarningsPanel s={s} />,
    history: <HistoryPanel s={s} />,
  };

  const next = nextShiftOf(s);
  const summary: Record<TabKey, string> = {
    overview: awaiting ? "Awaiting assignment" : `${s.role} at ${s.client}`,
    attendance: m.att.pct !== null ? `${m.att.pct}% on time` : "No attendance yet",
    schedule: next ? `Next: ${formatDateShort(next.date)}, ${next.shift}` : "No upcoming shifts",
    leave: lv ? `${lv.value} ${lv.unit ?? ""} ${lv.caption}`.replace(/\s+/g, " ") : "No leave on record",
    training: m.training.total ? `${m.training.done} of ${m.training.total} completed` : "None assigned",
    documents: m.docs.total ? `${m.docs.valid} of ${m.docs.total} valid` : "No documents yet",
    agreements: s.agreements.length ? `${s.agreements.filter((a) => a.state === "Accepted").length} of ${s.agreements.length} accepted` : "None yet",
    warnings: s.warnings.length ? `${s.warnings.length} on record` : "None",
    history: `${s.assignments.length} ${s.assignments.length === 1 ? "assignment" : "assignments"}, ${s.activity.length} updates`,
  };

  return (
    <div>
      {/* LEVEL 1, phone: cover, ONE status, Call / Email, a "..." menu, ONE sticky primary action. */}
      <PhoneDetailHead
        backHref={STAFF_DIRECTORY_HREF}
        backLabel="Staff Directory"
        visual={{ kind: "initials", text: initialsOf(s.name) }}
        title={s.name}
        status={<StatePhonePill state={state} status={s.status} />}
        line={
          <>
            {roleLine ? <span className="block">{roleLine}</span> : null}
            <span className="block">{placeLine}</span>
            <span className="block break-all">{s.reference}</span>
            {warningsChip ? <span className="mt-2 block">{warningsChip}</span> : null}
          </>
        }
        actions={
          <>
            <PhoneAction href={callHref} label="Call" icon={<Phone className="size-4" aria-hidden="true" />} />
            <PhoneAction href={`mailto:${s.email}`} label="Email" icon={<Mail className="size-4" aria-hidden="true" />} />
          </>
        }
        menu={<ActionsMenu quiet alignEnd label="More actions" triggerClassName={COVER_ROUND} items={menuItems} />}
      />
      <div aria-hidden="true" className="-mx-[18px] h-3 rounded-b-[28px] bg-(--ap-surface) min-[768px]:hidden max-[380px]:-mx-3.5" />
      <PhoneStickyAction>
        <Link href={reassignHref(s.id)} className={PD_CTA}>
          {primaryLabel}
        </Link>
      </PhoneStickyAction>

      {/* LEVEL 1, desktop and tablet. */}
      <header className="ap-card mb-6 rounded-xl p-5 max-[767px]:hidden">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <AdminAvatar name={s.name} size={72} viewable className="mt-0.5" />
            <div className="min-w-0">
              <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{s.name}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StateChip state={state} />
                {warningsChip}
              </div>
              {roleLine ? <p className="mt-2.5 text-[15px] leading-snug break-words text-(--ap-ink-2)">{roleLine}</p> : null}
              <p className="mt-0.5 text-[15px] leading-snug break-words text-(--ap-muted)">{placeLine}</p>
              <p className="mt-1 text-[13px] break-all text-(--ap-muted)">{s.reference}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 min-[1100px]:justify-end">
            <span data-admin-detail="" hidden />
            <a href={callHref} className="ap-btn ap-btn-s h-11 px-4 text-[14px] font-semibold">
              <Phone className="size-4" aria-hidden="true" /> Call
            </a>
            <a href={`mailto:${s.email}`} className="ap-btn ap-btn-s h-11 px-4 text-[14px] font-semibold">
              <Mail className="size-4" aria-hidden="true" /> Email
            </a>
            <Link href={reassignHref(s.id)} className="ap-btn ap-btn-p h-11 px-5 text-[15px] font-semibold text-white!">
              {primaryLabel}
            </Link>
            <ActionsMenu quiet label="More actions" items={menuItems} />
          </div>
        </div>
      </header>

      {/* LEVEL 2: At a glance. */}
      {glance.length > 0 ? (
        <section aria-label="At a glance" className="mb-6 @container">
          <h2 className="mb-3 text-[13px] font-bold tracking-wide text-(--ap-muted) uppercase max-[767px]:mt-4 max-[767px]:mb-2.5 max-[767px]:text-[12px]">At a glance</h2>
          <div className="grid grid-cols-2 gap-3 @min-[880px]:grid-cols-4 @min-[880px]:gap-4">{glance}</div>
        </section>
      ) : null}

      {/* LEVEL 3: detail. */}
      <div ref={sectionsRef} className="scroll-mt-20">
        {phone ? (
          <div className="ap-card overflow-hidden rounded-[24px]">
            {TABS.map((t) => {
              const on = openKey === t.key;
              return (
                <section key={t.key} aria-label={t.label} className="border-t border-(--ap-line-2) first:border-t-0">
                  <h2 className="m-0">
                    <button type="button" aria-expanded={on} aria-controls={`${tabId}-${t.key}`} onClick={() => setOpenKey(on ? null : t.key)} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none focus-visible:ring-inset">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] leading-tight font-extrabold text-(--ap-ink)">{t.label}</span>
                        <span className="mt-0.5 block text-[13.5px] leading-snug font-normal break-words text-(--ap-muted)">{summary[t.key]}</span>
                      </span>
                      {t.key === "warnings" && s.warnings.length > 0 ? <Pill tone="bad">{s.warnings.length}</Pill> : null}
                      <ChevronDown className={`size-[18px] shrink-0 text-(--ap-muted) transition-transform ${on ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  </h2>
                  {on ? (
                    <div id={`${tabId}-${t.key}`} className="px-4 pb-4">
                      {panels[t.key]}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Staff sections" className="mb-6 flex flex-wrap gap-2">
              {TABS.map((t) => {
                const on = t.key === tab;
                const count = t.key === "warnings" && s.warnings.length > 0 ? s.warnings.length : null;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    id={`${tabId}-${t.key}`}
                    aria-selected={on}
                    aria-controls={`${tabId}-panel`}
                    onClick={() => setTab(t.key)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] leading-none font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-offset-1 focus-visible:outline-none ${on ? "border-[#8b2252] bg-[#8b2252] text-white" : "border-(--ap-line) bg-(--ap-surface) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
                  >
                    {t.label}
                    {count !== null ? <span className={on ? "text-white/80" : "text-(--ap-muted)"}>{count}</span> : null}
                  </button>
                );
              })}
            </div>
            <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`}>
              {panels[tab]}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
