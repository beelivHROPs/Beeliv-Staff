"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bell, BriefcaseBusiness, Calendar, ChevronRight, CircleAlert, Clock3, Files, LifeBuoy, MapPin, Plus, Sun, Upload, UserRound, Video, Check } from "@/components/applicant/icons";
import { CountUp } from "@/components/applicant/CountUp";
import { Reveal } from "@/components/applicant/motion";
import { Chip, EmptyState, ProgressBar } from "@/components/applicant/primitives";
import { CARD, IconTile, SectionCard, type TileTone } from "@/components/applicant/SectionCard";
import { STAFF_ART } from "@/lib/staff/assets";
import { dayMonth, dayNumber, dueLabel, formatClock, formatClockRange, longDate, timeAgo, todayISO, addDays, weekday } from "@/lib/staff/format";
import { useNotifications } from "@/lib/staff/hooks";
import type { AttendanceRecord, LeaveRequest, RequiredAction, Shift, StaffAssignment, StaffHome } from "@/lib/staff/types";
import { BookOpen, CircleCheck, Megaphone } from "../icons";
import { ImageRoom } from "../ImageRoom";
import { usePilotHidden } from "@/lib/pilot/context";
import { ActionPill } from "../kit";

const LINK = "ap-hit inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum)";
function More({ href, children }: { href: string; children: ReactNode }) {
  // Pilot menu: a link to a later-stage screen is left out.
  const hidden = usePilotHidden();
  if (hidden(href)) return null;
  return (
    <Link href={href} className={LINK}>
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

/* ---------- 4-up today row (factual states, not KPIs) ---------- */

const ATT_LABEL: Record<string, [string, string]> = {
  "no-shift": ["No shift today", "Nothing to check in for"],
  upcoming: ["Shift upcoming", "Check-in opens later"],
  ready: ["Not checked in", "Check in to start your shift"],
  "checked-in": ["Checked in", "You're on shift"],
  "checked-out": ["Checked out", "Shift complete"],
  attention: ["Needs attention", "Open Attendance for details"],
};

export function TodayRow({ home }: { home: StaffHome }) {
  const { today, leaveSummary, learningSummary, leave, learning } = home;
  const shift = today.shift;
  const [attV, attS] = ATT_LABEL[today.state];
  const nextLeave = leave.find((l) => l.status === "approved" || l.status === "pending");
  const cards: { icon: typeof Calendar; tone: TileTone; label: string; value: ReactNode; sub: string; href: string }[] = [
    { icon: Calendar, tone: "v", label: "Today's shift", value: shift ? formatClockRange(shift.startTime, shift.endTime) : "No shift today", sub: shift ? shift.section : "Enjoy the time off", href: "/staff/schedule" },
    { icon: Clock3, tone: today.state === "attention" ? "a" : "ok", label: "Attendance", value: attV, sub: attS, href: "/staff/attendance" },
    leaveSummary
      ? { icon: Sun, tone: "a", label: "Leave", value: <><CountUp value={leaveSummary.remaining} /> {leaveSummary.unit}</>, sub: `${leaveSummary.used} ${leaveSummary.unit} used`, href: "/staff/leave" }
      : { icon: Sun, tone: "a", label: "Leave", value: nextLeave ? (nextLeave.status === "approved" ? "Approved" : "Pending") : "No activity", sub: nextLeave ? `${dayMonth(nextLeave.startDate)} - ${dayMonth(nextLeave.endDate)}` : "Nothing requested", href: "/staff/leave" },
    learningSummary
      ? { icon: BookOpen, tone: "v", label: "Training progress", value: <><CountUp value={learningSummary.completed} />/{learningSummary.total}</>, sub: "Completed modules", href: "/staff/sops-training" }
      : { icon: BookOpen, tone: "v", label: "Training", value: learning.length ? `${learning.length} in progress` : "None in progress", sub: "SOPs and training", href: "/staff/sops-training" },
  ];
  return (
    <Reveal className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4 min-[768px]:gap-4">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className="ap-card ap-card-hover flex min-w-0 items-center gap-3 rounded-[18px] p-3.5 min-[768px]:p-4 max-[420px]:flex-col max-[420px]:items-start max-[420px]:gap-2">
          <IconTile icon={c.icon} tone={c.tone} />
          <span className="min-w-0">
            <span className="ap-label block text-(--ap-muted)">{c.label}</span>
            <b className="ap-title block">{c.value}</b>
            <span className="ap-label block text-(--ap-muted)">{c.sub}</span>
          </span>
        </Link>
      ))}
    </Reveal>
  );
}

/* ---------- Quick actions ---------- */

export function QuickActions() {
  const items = [
    { icon: Calendar, label: "View schedule", href: "/staff/schedule" },
    { icon: Plus, label: "Request leave", href: "/staff/leave" },
    { icon: BookOpen, label: "View SOPs", href: "/staff/sops-training" },
    { icon: Files, label: "My documents", href: "/staff/documents" },
  ];
  // Pilot menu: shortcuts to later-stage screens are left out; what is left shares the row.
  const hidden = usePilotHidden();
  const shown = items.filter((q) => !hidden(q.href));
  if (shown.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 min-[768px]:mx-0 min-[768px]:grid min-[768px]:grid-cols-4 min-[768px]:gap-4 min-[768px]:overflow-visible min-[768px]:px-0" role="group" aria-label="Quick actions">
      {shown.map((q) => (
        <ActionPill key={q.label} href={q.href} icon={q.icon} variant="outline" compact arrow={false} className="w-full min-w-0">
          {q.label}
        </ActionPill>
      ))}
    </div>
  );
}

/* ---------- My Assignment ---------- */

export function AssignmentCard({ a, className }: { a: StaffAssignment | null; className: string }) {
  if (!a) {
    return (
      <SectionCard title="My Assignment" className={className} aside>
        <EmptyState icon={BriefcaseBusiness} title="No assignment yet" description="When Beeliv confirms where you'll work, your outlet, role and start date appear here." />
      </SectionCard>
    );
  }
  const fields: [string, string][] = [
    ["Position", a.role],
    ["Department", a.department],
    ["Supervisor", a.supervisor?.name ?? "To be confirmed"],
    ["Start date", dayMonth(a.startDate) + " " + a.startDate.slice(0, 4)],
  ];
  return (
    <SectionCard title="My Assignment" className={className} aside action={<More href="/staff/assignment">View details</More>}>
      <div className="flex items-start gap-3.5">
        <ImageRoom src={a.outlet.imageUrl} alt={a.outlet.name} className="size-[76px] shrink-0 rounded-2xl min-[768px]:h-[84px] min-[768px]:w-[110px]" />
        <div className="min-w-0 flex-1">
          <b className="ap-title block text-[18px]">{a.outlet.name}</b>
          <span className="ap-sm mt-0.5 flex items-center gap-1.5 text-(--ap-muted)">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {a.outlet.location}
          </span>
          <div className="mt-2 min-[768px]:hidden">
            <Chip tone={a.status === "active" ? "ok" : "info"}>{a.status === "active" ? "Active" : "Starts soon"}</Chip>
          </div>
        </div>
        <div className="hidden min-[768px]:block">
          <Chip tone={a.status === "active" ? "ok" : "info"}>{a.status === "active" ? "Active" : "Starts soon"}</Chip>
        </div>
      </div>
      {/* 4 across only when the card itself is wide enough (it also sits in a narrow side column). */}
      <div className="@container">
        <dl className="mt-4 grid grid-cols-2 gap-3 @min-[560px]:grid-cols-4">
          {fields.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="ap-label text-(--ap-muted)">{k}</dt>
              <dd className="ap-sm mt-1 rounded-xl border border-(--ap-line) bg-(--ap-tint-soft) px-3 py-2 font-semibold text-(--ap-ink)">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {a.tags.length ? (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {a.tags.map((t) => (
            <Chip key={t} tone="violet">{t}</Chip>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}

/* ---------- Today's schedule timeline ---------- */

export function TodayTimeline({ shifts, className }: { shifts: Shift[]; className: string }) {
  const shift = shifts[0];
  const now = new Date();
  const nowKey = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const events = shift ? [...shift.agenda].sort((x, y) => x.time.localeCompare(y.time)) : [];
  const last = events.length ? events[events.length - 1].time : "";
  const currentIdx = events.length && nowKey >= events[0].time && nowKey < last ? events.map((e) => e.time <= nowKey).lastIndexOf(true) : -1;
  return (
    <SectionCard title="Today's Schedule" aside className={className} action={<More href="/staff/schedule">Full schedule</More>}>
      {!shift ? (
        <EmptyState icon={Calendar} title="No shift today" description="Nothing is scheduled for you today. Check Upcoming Schedule for your next shift." />
      ) : events.length === 0 ? (
        <p className="ap-sm">{formatClockRange(shift.startTime, shift.endTime)} - {shift.section}</p>
      ) : (
        <ol className="relative flex flex-col">
          {events.map((e, i) => {
            const cur = i === currentIdx;
            return (
              <li key={e.time + e.label} className={`relative grid grid-cols-[78px_28px_minmax(0,1fr)] items-start gap-x-2 rounded-xl py-2.5 pr-2 ${cur ? "bg-(--ap-tint)" : ""}`}>
                <span className="ap-sm pl-1.5 font-bold text-(--ap-ink-2)">{formatClock(e.time)}</span>
                <span className="relative flex flex-col items-center self-stretch">
                  <span className={`z-[1] flex size-6 items-center justify-center rounded-full border-2 ${cur ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-tint-2) bg-white text-(--ap-violet)"}`}>
                    {e.kind === "break" ? <Clock3 className="size-3" /> : e.kind === "end" ? <Check className="size-3" strokeWidth={2.4} /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  {i < events.length - 1 ? <span className="absolute top-6 -bottom-2.5 w-px bg-(--ap-line)" aria-hidden="true" /> : null}
                </span>
                <span className="min-w-0">
                  <b className="ap-sm block text-(--ap-ink)">{e.label}</b>
                  {e.detail ? <span className="ap-label block text-(--ap-muted)">{e.detail}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {shift?.notes ? <p className="ap-sm mt-3 rounded-xl bg-(--ap-tint-soft) p-3 text-(--ap-ink-2)">{shift.notes}</p> : null}
    </SectionCard>
  );
}

/* ---------- Required from you ---------- */

const ACTION_ICON = { document: Upload, "document-request": Upload, sop: BookOpen, training: Video, "assignment-update": BriefcaseBusiness, onboarding: UserRound } as const;
const ACTION_TONE: Record<RequiredAction["kind"], TileTone> = { document: "a", "document-request": "a", sop: "v", training: "v", "assignment-update": "ok", onboarding: "v" };

export function RequiredCard({ actions: all, className }: { actions: RequiredAction[]; className: string }) {
  // Pilot menu: actions that only open a later-stage screen (SOP or training reviews) are left out.
  const hidden = usePilotHidden();
  const actions = all.filter((a) => !hidden(a.href));
  return (
    <SectionCard title="Required from you" aside className={className} action={actions.length ? <More href="/staff/documents">View all</More> : undefined}>
      {actions.length === 0 ? (
        <EmptyState icon={CircleCheck} title="You're all caught up" description="Nothing needs your attention right now." />
      ) : (
        <ul className="flex flex-col gap-3">
          {actions.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-(--ap-line-2) p-3">
              <IconTile icon={ACTION_ICON[a.kind]} tone={ACTION_TONE[a.kind]} />
              <div className="min-w-0 flex-1">
                <b className="ap-title block leading-snug">{a.title}</b>
                <span className="ap-label block text-(--ap-muted)">{a.dueDate ? dueLabel(a.dueDate) : a.detail}</span>
              </div>
              <ActionPill href={a.href} variant="outline" compact arrow={false} className="shrink-0">
                {a.actionLabel}
              </ActionPill>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------- Upcoming schedule ---------- */

export function UpcomingCard({ shifts, className }: { shifts: Shift[]; className: string }) {
  const today = todayISO();
  const days = [0, 1, 2, 3].map((i) => addDays(today, i));
  return (
    <SectionCard title="Upcoming Schedule" aside className={className} action={<More href="/staff/schedule">View calendar</More>}>
      <ul className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-4">
        {days.map((d) => {
          const s = shifts.find((x) => x.date === d);
          const isToday = d === today;
          return (
            <li key={d} className={`flex items-center gap-3 rounded-2xl border p-3.5 min-[768px]:flex-col min-[768px]:items-start min-[768px]:gap-1.5 ${isToday ? "border-(--ap-violet) bg-(--ap-tint-soft)" : "border-(--ap-line)"}`}>
              <div className="flex min-w-[64px] items-baseline gap-1.5 min-[768px]:min-w-0">
                <b className="ap-title">{weekday(d)}</b>
                <span className="ap-sm text-(--ap-muted)">{dayNumber(d)} {dayMonth(d).split(" ")[1]}</span>
              </div>
              {isToday ? <Chip tone="violet">Today</Chip> : null}
              <div className="min-w-0 flex-1 min-[768px]:flex-none">
                {s ? (
                  <>
                    <b className="ap-sm block text-(--ap-ink)">{formatClockRange(s.startTime, s.endTime)}</b>
                    <span className="ap-label block text-(--ap-muted)">{s.section}</span>
                  </>
                ) : (
                  <span className="ap-sm block text-(--ap-muted)">No shift scheduled</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/* ---------- Recent attendance ---------- */

export function RecentAttendance({ records, className }: { records: AttendanceRecord[]; className: string }) {
  const today = todayISO();
  const days = [-6, -5, -4, -3, -2, -1, 0].map((o) => addDays(today, o));
  return (
    <SectionCard title="Recent Attendance" aside className={className} action={<More href="/staff/attendance">View all</More>}>
      <ul className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const r = records.find((x) => x.date === d);
          const [label, cls, Icon] =
            r?.status === "recorded" ? ["Done", "bg-(--ap-ok-bg) text-(--ap-ok)", Check]
            : r?.status === "attention" ? ["Review", "bg-(--ap-warn-bg) text-(--ap-warn)", CircleAlert]
            : d === today ? ["Today", "border border-dashed border-(--ap-tint-2) text-(--ap-faint)", null]
            : ["Off", "bg-(--ap-line-2) text-(--ap-faint)", null];
          return (
            <li key={d} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <b className="ap-label text-(--ap-ink)">{dayNumber(d)}</b>
              <span className="text-[12px] text-(--ap-muted)">{weekday(d)}</span>
              <span className={`flex size-8 items-center justify-center rounded-full ${cls}`}>{Icon ? <Icon className="size-4" strokeWidth={2.2} /> : <span className="h-0.5 w-2.5 rounded bg-current" />}</span>
              <span className="text-[12px] font-semibold text-(--ap-muted)">{label}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/* ---------- Leave activity ---------- */

const LEAVE_CHIP: Record<LeaveRequest["status"], ReactNode> = {
  approved: <Chip tone="ok">Approved</Chip>,
  pending: <Chip tone="warn">Pending</Chip>,
  rejected: <span className="ap-chip bg-(--ap-rose-bg) text-(--ap-rose)">Rejected</span>,
  cancelled: <Chip tone="mute">Cancelled</Chip>,
};

export function LeaveCard({ leave, className }: { leave: LeaveRequest[]; className: string }) {
  return (
    <SectionCard title="Leave activity" aside className={className} action={<More href="/staff/leave">View all</More>}>
      {leave.length === 0 ? (
        <EmptyState icon={Sun} title="No leave activity" description="Requests you make appear here with their status." action={<ActionPill href="/staff/leave" variant="purple" compact icon={Plus} arrow={false} className="mt-1.5">Request leave</ActionPill>} />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {leave.slice(0, 3).map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <IconTile icon={Sun} tone={l.status === "approved" ? "ok" : "a"} />
                <div className="min-w-0 flex-1">
                  <b className="ap-title block">{l.type}</b>
                  <span className="ap-label block text-(--ap-muted)">{l.startDate === l.endDate ? longDate(l.startDate) : `${dayMonth(l.startDate)} - ${dayMonth(l.endDate)}`}</span>
                </div>
                {LEAVE_CHIP[l.status]}
              </li>
            ))}
          </ul>
          <ActionPill href="/staff/leave" variant="outline" compact icon={Plus} arrow={false} className="mt-4">
            Request leave
          </ActionPill>
        </>
      )}
    </SectionCard>
  );
}

/* ---------- Training & SOPs ---------- */

export function LearningCard({ items, className }: { items: StaffHome["learning"]; className: string }) {
  return (
    <SectionCard title="Training & SOPs" aside className={className} action={<More href="/staff/sops-training">View all</More>}>
      {items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing in progress" description="Assigned SOPs and training appear here." />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={i.href} className="block">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <b className="ap-title min-w-0 truncate">{i.title}</b>
                  <span className="ap-label shrink-0 text-(--ap-muted)">{i.progress}%</span>
                </div>
                <ProgressBar percent={i.progress} label={`${i.title} progress`} />
                <span className="ap-label mt-1 flex items-center justify-between text-(--ap-muted)">
                  <span>{i.kind === "sop" ? "SOP" : "Training"}</span>
                  {i.dueDate ? <span>{dueLabel(i.dueDate)}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------- Announcements ---------- */

export function AnnouncementsCard({ items, className }: { items: StaffHome["announcements"]; className: string }) {
  return (
    <SectionCard title="Company Announcements" aside className={className}>
      {items.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements" description="News from Beeliv and your outlet shows up here." />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.slice(0, 2).map((a) => (
            <li key={a.id} className="flex gap-3.5">
              <ImageRoom src={a.imageUrl} icon={Megaphone} className="h-[72px] w-[92px] shrink-0 rounded-xl" iconClassName="size-7" />
              <div className="min-w-0 flex-1">
                <b className="ap-title block">{a.title}</b>
                <p className="ap-sm line-clamp-2 text-(--ap-muted)">{a.body}</p>
                <span className="ap-label text-(--ap-faint)">{timeAgo(a.publishedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------- Notifications card ---------- */

export function NotificationsCard({ className }: { className: string }) {
  const { data } = useNotifications();
  const items = (data ?? []).slice(0, 3);
  return (
    <SectionCard title="Notifications" aside className={className} action={<More href="/staff/notifications">View all</More>}>
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="Updates from Beeliv appear here." />
      ) : (
        <ul className="flex flex-col">
          {items.map((n, i) => (
            <li key={n.id} className={i > 0 ? "border-t border-(--ap-line-2)" : ""}>
              <Link href={n.destination.href} className="flex items-center gap-3 py-3">
                <span className={`size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-(--ap-violet)"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <b className="block text-base leading-snug text-(--ap-ink)">{n.title}</b>
                  <span className="ap-label font-bold text-(--ap-violet)">{n.destination.label}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------- Support card + career strip ---------- */

export function SupportCard({ className }: { className: string }) {
  return (
    <Reveal className={`staff-dark-card flex items-center gap-4 overflow-hidden rounded-[20px] p-5 ${className}`}>
      <div className="min-w-0 flex-1">
        <b className="ap-serif block text-[22px] leading-tight">Need assistance?</b>
        <p className="ap-sm mt-1 text-white/78">Our team is here to help, anytime.</p>
        <ActionPill href="/staff/help" variant="purple" compact icon={LifeBuoy} className="mt-3">Contact support</ActionPill>
      </div>
      <ImageRoom src={STAFF_ART.supportPhoto} icon={LifeBuoy} className="size-[84px] shrink-0 rounded-2xl" iconClassName="size-9" />
    </Reveal>
  );
}

export function CareerStrip() {
  return (
    <Reveal className={`${CARD} flex flex-wrap items-center justify-between gap-4 bg-[image:var(--ap-gradient)]! text-white`}>
      <div className="min-w-0">
        <b className="ap-serif block text-[24px] leading-tight">Grow your career</b>
        <p className="ap-sm mt-1 text-white/78">Explore new opportunities, training and career paths with Beeliv.</p>
      </div>
      <ActionPill href="/staff/sops-training" variant="outline" compact className="shrink-0">
        View opportunities
      </ActionPill>
    </Reveal>
  );
}

