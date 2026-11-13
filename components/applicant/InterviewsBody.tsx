"use client";

/**
 * Interviews & Assessments (phone first).
 *
 * One purpose: "when is my next interview and how do I get there".
 *  - Upcoming: the next interview is a ticket-style card (large date and time, a soft countdown, how to join,
 *    ONE strongest action). Any later ones are the same card, smaller. On wide screens the prep list and the
 *    later interviews sit in a second column; on phones the prep list opens in a bottom sheet.
 *  - Past: one quiet list (completed and cancelled).
 * The candidate RECEIVES the time (there is nothing to confirm). "Can't make this time? Message HR" only tells HR.
 * Dates are computed from the real timestamps and shown in WAT. Presentation only: data, the "waiting / rescheduled /
 * cancelled" states and the request flow come from lib/applicant/interview-state.ts and lib/bridge/interview-requests.ts.
 */
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Calendar,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  MapPin,
  MessageSquareText,
  Phone,
  RotateCw,
  UserRound,
  Users,
  Video,
  type LucideIcon,
} from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { sendCantMakeIt, useApplicantStore, withdrawCantMakeIt } from "@/lib/applicant/service";
import { interviewView, type InterviewView } from "@/lib/applicant/interview-state";
import { useInterviewRequests, type InterviewTimeRequest } from "@/lib/bridge/interview-requests";
import { confirmAction } from "./ConfirmDialog";
import { clockRange, dateBlock, sentStamp, startsIn, whenLabel } from "./interviews/format";
import type { Interview, InterviewKind } from "@/lib/applicant/types";
import { Chip, EmptyState } from "./primitives";
import { MessageHrSheet } from "./interviews/MessageHrSheet";
import { PrepList, PrepSheet } from "./interviews/PrepSheet";
import { fmtDay, ScreenHeading } from "./applications/shared";
import { Reveal } from "./motion";

type Tab = "up" | "done";

/**
 * Glyph per interview stage (Module 1 §5): HR screening, Beeliv interview,
 * client/business interview, practical assessment. Shared with Application detail.
 */
export const INTERVIEW_KIND_ICON: Record<InterviewKind, LucideIcon> = {
  Screening: Phone,
  Interview: UserRound,
  "Client interview": Users,
  "Practical assessment": FileCheck2,
};

/** Applicant-facing stage label (the stored kind, spelled out where it helps). */
export const INTERVIEW_KIND_LABEL: Record<InterviewKind, string> = {
  Screening: "HR screening",
  Interview: "Beeliv interview",
  "Client interview": "Client interview",
  "Practical assessment": "Practical assessment",
};

/** Current time, filled in after mount (so the server and first client paint agree) and refreshed every 30 seconds. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return now;
}

const QUIET_BTN = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold text-(--ap-violet) transition-colors hover:bg-(--ap-tint)";
const SURFACE = "rounded-[24px] border border-(--ap-line) bg-white shadow-(--ap-shadow)";

export function InterviewsBody() {
  const store = useApplicantStore();
  const requests = useInterviewRequests();
  const [tab, setTab] = useState<Tab>("up");
  // Announced to screen readers when a request is sent or withdrawn (the visible change is the card itself).
  const [announce, setAnnounce] = useState("");
  const scheduled = store.interviews
    .filter((v) => v.status === "scheduled")
    .sort((a, b) => ((a.scheduledAt ?? "") < (b.scheduledAt ?? "") ? -1 : 1));
  // "Needs a new time" first: the applicant asked and HR has not answered yet.
  const needsTime = scheduled.filter((v) => interviewView(v, requests).kind === "waiting");
  const comingUp = scheduled.filter((v) => interviewView(v, requests).kind !== "waiting");
  const upcoming = [...needsTime, ...comingUp];
  const completed = store.interviews
    .filter((v) => v.status === "completed")
    .sort((a, b) => ((a.completedAt ?? "") > (b.completedAt ?? "") ? -1 : 1));
  const cancelled = store.interviews.filter((v) => v.status === "cancelled");
  const pastCount = completed.length + cancelled.length;
  const hero = upcoming[0] ?? null;
  const later = upcoming.slice(1);
  const heroPrep = !!hero && interviewView(hero, requests).kind !== "waiting" && !!hero.prep?.length;

  return (
    <div className="pb-[calc(16px+env(safe-area-inset-bottom,0px))] min-[768px]:pb-0">
      <ScreenHeading title="Interviews & Assessments" subtitle="Your scheduled and completed interviews and assessments." />
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {upcoming.length + pastCount === 0 ? (
        <div className={`${SURFACE} mt-2 max-w-[640px]`}>
          <EmptyState
            icon={Calendar}
            title="No interviews yet"
            description="When HR schedules an interview or assessment, the day, time and how to join will appear here."
            action={
              <Link href="/applicant/applications" className="ap-btn ap-btn-p ap-btn-hero text-white!">
                View my applications
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <Segmented
            active={tab}
            onChange={setTab}
            tabs={[
              { key: "up", label: "Upcoming", count: upcoming.length },
              { key: "done", label: "Past", count: pastCount },
            ]}
          />

          {tab === "up" ? (
            hero ? (
              <div className={`mt-5 grid gap-6 ${heroPrep || later.length ? "min-[1024px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] min-[1024px]:items-start" : "max-w-[760px]"}`}>
                <Ticket key={hero.id} v={hero} requests={requests} announce={setAnnounce} hero />
                <div className={`${later.length ? "flex" : "hidden min-[1024px]:flex"} flex-col gap-6`}>
                  {heroPrep ? (
                    <section className={`${SURFACE} hidden p-6 min-[1024px]:block`} aria-labelledby="prep-h">
                      <h2 id="prep-h" className="ap-serif mb-4 text-[22px] text-(--ap-ink)">
                        Before you join
                      </h2>
                      <PrepList items={hero.prep ?? []} />
                    </section>
                  ) : null}
                  {later.length ? (
                    <section aria-labelledby="later-h" className="flex flex-col gap-3">
                      <h2 id="later-h" className="ap-eb">
                        Coming up
                      </h2>
                      {later.map((v) => (
                        <Ticket key={v.id} v={v} requests={requests} announce={setAnnounce} />
                      ))}
                    </section>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className={`${SURFACE} mt-5 max-w-[640px]`}>
                <EmptyState icon={Calendar} title="Nothing coming up" description="When HR schedules your next interview or assessment, it will appear here." />
              </div>
            )
          ) : pastCount ? (
            <PastList completed={completed} cancelled={cancelled} requests={requests} />
          ) : (
            <div className={`${SURFACE} mt-5 max-w-[640px]`}>
              <EmptyState icon={CalendarCheck} title="Nothing in the past yet" description="Completed and cancelled interviews and assessments are listed here." />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Two big, thumb-sized choices with a visible count. Plain buttons: nothing slides, so there is nothing to disable for reduced motion. */
function Segmented({ tabs, active, onChange }: { tabs: { key: Tab; label: string; count: number }[]; active: Tab; onChange: (k: Tab) => void }) {
  return (
    <div role="tablist" aria-label="Filter interviews" className="mt-1 flex w-full gap-1 rounded-full border border-(--ap-line) bg-white p-1 min-[768px]:w-max">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors min-[768px]:flex-none min-[768px]:px-7 ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-ink-2) hover:bg-(--ap-tint)"}`}
          >
            {t.label}
            <span className={`text-[14px] tabular-nums ${on ? "text-white/80" : "text-(--ap-muted)"}`}>{t.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/** "23 Oct, 10:00 AM": the short form of an earlier time, for one quiet line. */
function shortWhen(iso: string): string {
  const d = dateBlock(iso);
  return `${d.day} ${d.month.slice(0, 3)}, ${clockRange(iso).start}`;
}

function modeIcon(mode: string | undefined): LucideIcon {
  if (/video/i.test(mode ?? "")) return Video;
  if (/phone|call/i.test(mode ?? "")) return Phone;
  return MapPin;
}

function Ticket({ v, requests, announce, hero = false }: { v: Interview; requests: InterviewTimeRequest[]; announce: (text: string) => void; hero?: boolean }) {
  const view = interviewView(v, requests);
  const waiting = view.kind === "waiting";
  const [sheet, setSheet] = useState(false);
  const [prepOpen, setPrepOpen] = useState(false);
  // The candidate RECEIVES the time; there is nothing to confirm. Join only exists for a video interview with a link.
  const isVideo = /video/i.test(v.mode ?? "");
  const link = isVideo && v.meetingLink && /^https:\/\/\S+$/i.test(v.meetingLink) ? v.meetingLink : null;
  const now = useNow();
  // Active window rule: the Join button works from 15 minutes before the start.
  const start = v.scheduledAt ? new Date(v.scheduledAt).getTime() : null;
  const joinOpen = !waiting && !!link && start !== null && now !== null && now >= start - 15 * 60_000;
  const passed = start !== null && now !== null && start <= now;
  const date = v.scheduledAt ? dateBlock(v.scheduledAt) : null;
  const clock = v.scheduledAt ? clockRange(v.scheduledAt, v.durationMinutes) : null;
  const kindLabel = INTERVIEW_KIND_LABEL[v.kind] ?? v.kind;
  const [role, company] = v.applicationLabel.split(" · ");
  const hasPrep = !waiting && !!v.prep?.length;
  const ModeIcon = modeIcon(v.mode);

  function addToCalendar() {
    if (!v.scheduledAt) return;
    downloadIcs(v);
    toast.add({ title: "Added to your calendar", description: "Open the downloaded file to save it in your calendar app.", type: "success" });
  }

  /** Confirmation sheet: stays open (and says why) when offline, so nothing is lost. */
  async function askWithdraw() {
    if (view.kind !== "waiting") return;
    const ok = await confirmAction({
      tone: "caution",
      icon: RotateCw,
      title: "Withdraw your request?",
      description: "Your interview goes back to its original time, and HR is told.",
      confirmLabel: "Withdraw request",
      cancelLabel: "Keep my request",
      onConfirm: () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          toast.add({ title: "We could not withdraw your request", description: "You appear to be offline. Your request is unchanged. Check your connection and try again.", type: "error" });
          return Promise.reject(new Error("offline"));
        }
      },
    });
    if (ok) withdraw();
  }

  function withdraw() {
    if (view.kind !== "waiting") return;
    withdrawCantMakeIt(view.request.id);
    announce("Your request was withdrawn. Your interview is back at its original time.");
    toast.add({ title: "Request withdrawn", description: "Your interview is back at its original time. HR has been told.", type: "success" });
  }

  const joinBtnClass = "ap-btn ap-btn-p ap-btn-hero w-full text-white! min-[768px]:w-auto";
  const joinIcon = <Video className="size-5" strokeWidth={1.7} aria-hidden="true" />;

  return (
    <Reveal as="section" aria-label={`${v.title}, ${v.applicationLabel}`} className={`${SURFACE} overflow-hidden`}>
      {/* The "stub": when. Large date, large time, a soft countdown. */}
      <div className={waiting ? "bg-(--ap-warn-bg)/35" : "bg-[#F8EFD9]/70"}>
        <div className={hero ? "px-5 pt-4 pb-5 min-[768px]:px-8 min-[768px]:pt-7 min-[768px]:pb-8" : "px-5 pt-4 pb-5"}>
          <div className="flex min-h-7 items-center justify-between gap-3">
            <span className="ap-eb whitespace-nowrap">{hero ? (waiting ? "Interview" : "Next interview") : kindLabel}</span>
            {waiting ? (
              <Chip tone="warn" icon={Clock3}>
                New time requested
              </Chip>
            ) : now !== null && v.scheduledAt ? (
              <span className="text-[15px] font-semibold whitespace-nowrap text-(--ap-violet)">{startsIn(v.scheduledAt, now)}</span>
            ) : null}
          </div>

          {date && clock ? (
            <div
              className={`${hero ? "mt-4 min-[768px]:mt-5" : "mt-3"} flex items-stretch gap-5 ${waiting ? "opacity-60" : ""}`}
              aria-label={`${waiting ? "Original time: " : ""}${date.weekdayLong} ${date.day} ${date.month}, ${clock.start}${clock.end ? ` to ${clock.end}` : ""}`}
            >
              <div className="flex flex-col justify-between">
                <span className="text-[13px] font-semibold tracking-[0.14em] text-(--ap-muted)">{date.weekday}</span>
                <span className={`ap-serif tabular-nums leading-[0.95] text-(--ap-ink) ${hero ? "text-[68px]" : "text-[44px]"} ${waiting ? "line-through decoration-1" : ""}`}>{date.day}</span>
                <span className="text-[14px] text-(--ap-ink-2)">{date.month}</span>
              </div>
              <span className="w-px self-stretch bg-(--ap-ink)/12" aria-hidden="true" />
              <div className="flex min-w-0 flex-col justify-end">
                <span className="text-[13px] font-semibold tracking-[0.14em] text-(--ap-muted)">TIME</span>
                <span className={`font-bold tracking-[-0.01em] text-(--ap-ink) tabular-nums ${hero ? "mt-1 text-[32px] leading-none" : "mt-1 text-[24px] leading-none"} ${waiting ? "line-through decoration-1" : ""}`}>{clock.start}</span>
                <span className="mt-1.5 text-[14px] text-(--ap-ink-2) tabular-nums">{clock.end ? `until ${clock.end} · WAT` : "WAT"}</span>
              </div>
              {waiting ? <span className="sr-only"> (no longer confirmed)</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Divider between stub and details. */}
      <div className="border-t border-dashed border-(--ap-line)" />

      <div className={hero ? "px-5 pt-4 pb-3 min-[768px]:px-8 min-[768px]:pt-6" : "px-5 pt-4 pb-3"}>
        <h2 className={`ap-serif leading-[1.15] text-(--ap-ink) ${hero ? "text-[26px]" : "text-[21px]"}`}>{v.title}</h2>
        <p className="mt-1 text-[15px] text-(--ap-muted)">
          {role}
          {company ? ` · ${company}` : ""}
          {INTERVIEW_KIND_LABEL[v.kind] !== v.title && hero ? ` · ${kindLabel}` : ""}
        </p>

        <div className="mt-3 flex flex-col gap-2 text-[15px] text-(--ap-ink-2) min-[768px]:mt-4 min-[768px]:gap-2.5">
          {v.mode ? <MetaRow icon={ModeIcon}>{v.mode}</MetaRow> : null}
          {v.withWhom ? <MetaRow icon={UserRound}>{v.withWhom}</MetaRow> : null}
          {view.kind === "rescheduled" ? (
            <MetaRow icon={CalendarCheck}>
              <span className="text-[14px] text-(--ap-muted)">
                <b className="font-semibold text-(--ap-violet)">New time</b> · was {shortWhen(view.request.scheduledAt)}
              </span>
            </MetaRow>
          ) : null}
        </div>

        {waiting && view.kind === "waiting" ? (
          <div className="mt-5 rounded-2xl border border-(--ap-line) bg-(--ap-warn-bg)/45 px-4 py-4">
            <div className="ap-eb mb-1.5">What happens next</div>
            <p className="text-[15px] leading-[1.55] text-(--ap-ink-2)">HR has your message. They will send you a new time here. You do not need to do anything else.</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-(--ap-line) pt-3 text-[14px]">
              <dt className="text-(--ap-muted)">Your message</dt>
              <dd className="m-0 wrap-anywhere">{view.request.reason}</dd>
              {view.request.note ? (
                <>
                  <dt className="text-(--ap-muted)">Note</dt>
                  <dd className="m-0 wrap-anywhere whitespace-pre-wrap">{view.request.note}</dd>
                </>
              ) : null}
              <dt className="text-(--ap-muted)">Sent</dt>
              <dd className="m-0">{sentStamp(view.request.requestedAt)}</dd>
            </dl>
          </div>
        ) : null}

        {hasPrep ? (
          <button
            type="button"
            onClick={() => setPrepOpen(true)}
            className={`mt-4 flex min-h-13 w-full items-center gap-3 rounded-2xl bg-(--ap-tint) px-4 text-left text-[15px] font-semibold text-(--ap-ink) ${hero ? "min-[1024px]:hidden" : ""}`}
          >
            <Check className="size-4.5 shrink-0 text-(--ap-violet)" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0 flex-1 whitespace-nowrap">Before you join</span>
            <span className="text-[14px] font-normal whitespace-nowrap text-(--ap-muted)">{v.prep?.length} things</span>
            <ChevronRight className="size-4.5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
          </button>
        ) : null}

        {/* The one strongest action. */}
        <div className="mt-4">
          {waiting ? (
            isVideo ? (
              <button type="button" disabled aria-describedby={`${v.id}-join-note`} className={joinBtnClass}>
                {joinIcon} Join
              </button>
            ) : null
          ) : link ? (
            joinOpen ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className={joinBtnClass}>
                {joinIcon} Join
              </a>
            ) : (
              <button type="button" disabled className={joinBtnClass}>
                {joinIcon} Join
              </button>
            )
          ) : (
            <button type="button" onClick={addToCalendar} className={joinBtnClass}>
              <Calendar className="size-5" strokeWidth={1.7} aria-hidden="true" /> Add to calendar
            </button>
          )}
          {waiting && isVideo ? (
            <p id={`${v.id}-join-note`} className="mt-2.5 text-center text-[14px] text-(--ap-muted)">
              Not available while we find a new time.
            </p>
          ) : null}
          {!waiting && isVideo && link && !joinOpen ? <p className="mt-2.5 text-center text-[14px] min-[1024px]:text-left text-(--ap-muted)">Join opens 15 minutes before the start time.</p> : null}
          {!waiting && isVideo && !link ? <p className="mt-2.5 text-center text-[14px] min-[1024px]:text-left text-(--ap-muted)">Your meeting link will appear here before the start. Join opens 15 minutes before.</p> : null}
        </div>
      </div>

      {/* Quiet actions. */}
      <div className="flex flex-col items-center px-3 pb-3 min-[1024px]:items-start min-[1024px]:px-5">
        {!waiting && link ? (
          <button type="button" onClick={addToCalendar} className={QUIET_BTN}>
            <Calendar className="size-4.5" strokeWidth={1.7} aria-hidden="true" /> Add to calendar
          </button>
        ) : null}

        {view.kind === "waiting" ? (
          <>
            <button type="button" onClick={() => void askWithdraw()} className={QUIET_BTN}>
              Withdraw my request
            </button>
            <span className="px-4 pb-2 text-center text-[14px] text-(--ap-muted)">Want to change your message? Withdraw it and send a new one.</span>
          </>
        ) : passed ? (
          <p className="px-4 pt-1 pb-3 text-center text-[14px] text-(--ap-muted)">This interview time has passed, so a new-time request can&apos;t be sent from here. If you missed it, please contact the Beeliv team.</p>
        ) : (
          <button type="button" onClick={() => setSheet(true)} className={`${QUIET_BTN} text-center text-(--ap-ink-2)`}>
            Can&apos;t make this time? Message HR
          </button>
        )}
      </div>

      <MessageHrSheet
        open={sheet}
        title={v.title}
        onClose={() => setSheet(false)}
        onSend={(reason, note) => {
          const r = sendCantMakeIt(v, reason, note);
          if (r.ok) announce("Your request was sent. HR has your message and will send you a new time here.");
          return r;
        }}
      />
      {hasPrep ? <PrepSheet open={prepOpen} items={v.prep ?? []} onClose={() => setPrepOpen(false)} /> : null}
    </Reveal>
  );
}

/** Past: one calm list. Completed and cancelled share the same row; status is a dot and a word. Public cancel reason only. */
function PastList({ completed, cancelled, requests }: { completed: Interview[]; cancelled: Interview[]; requests: InterviewTimeRequest[] }) {
  return (
    <Reveal as="section" aria-label="Past interviews" className={`${SURFACE} mt-5 max-w-[760px] px-5 py-2 min-[768px]:px-7`}>
      <ul className="m-0 list-none p-0">
        {cancelled.map((v, i) => (
          <PastRow key={v.id} first={i === 0} v={v} state={interviewView(v, requests)} />
        ))}
        {completed.map((v, i) => (
          <PastRow key={v.id} first={!cancelled.length && i === 0} v={v} state={null} />
        ))}
      </ul>
      <p className="border-t border-(--ap-line-2) py-4 text-[14px] text-(--ap-muted)">Interview notes and scores stay with the Beeliv team.</p>
    </Reveal>
  );
}

function PastRow({ v, state, first }: { v: Interview; state: InterviewView | null; first: boolean }) {
  const isCancelled = v.status === "cancelled";
  const reason = state?.kind === "cancelled" ? state.request?.outcome?.publicReason?.trim() : "";
  const original = state?.kind === "cancelled" && state.request ? state.request.scheduledAt : v.scheduledAt;
  return (
    <li className={`py-4 ${first ? "" : "border-t border-(--ap-line-2)"}`}>
      <b className="block text-[16px] leading-snug text-(--ap-ink)">{v.title}</b>
      <span className="mt-0.5 block text-[14px] text-(--ap-muted)">
        {v.applicationLabel}
        {!isCancelled && v.completedAt ? ` · ${fmtDay(v.completedAt)}` : ""}
      </span>
      <span className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-(--ap-ink-2)">
        <i className={`size-2 rounded-full ${isCancelled ? "bg-(--ap-muted)" : "bg-(--ap-ok)"}`} aria-hidden="true" />
        {isCancelled ? "Cancelled by Beeliv" : "Completed"}
      </span>
      {isCancelled ? (
        <div className="mt-2 flex flex-col gap-1.5 text-[14px] text-(--ap-ink-2)">
          {original ? (
            <MetaRow icon={Clock3}>
              <span>
                <span className="text-(--ap-muted)">Was: </span>
                <s className="decoration-1">{whenLabel(original, v.durationMinutes)}</s>
                <span className="sr-only"> (cancelled)</span>
              </span>
            </MetaRow>
          ) : null}
          {reason ? (
            <MetaRow icon={MessageSquareText}>
              <span className="wrap-anywhere">Reason from Beeliv: {reason}</span>
            </MetaRow>
          ) : null}
          <p className="text-(--ap-muted)">We will contact you if another interview is needed.</p>
        </div>
      ) : null}
    </li>
  );
}

function MetaRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/** Builds a standard .ics file for the interview and downloads it (no dependency, no network). */
function downloadIcs(v: Interview) {
  if (!v.scheduledAt) return;
  const start = new Date(v.scheduledAt);
  const end = new Date(start.getTime() + (v.durationMinutes ?? 45) * 60_000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Beeliv Hospitality//Applicant//EN",
    "BEGIN:VEVENT",
    `UID:${v.id}@beeliv-applicant`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${v.title} · ${v.applicationLabel}`)}`,
    `DESCRIPTION:${esc([v.mode, v.withWhom].filter(Boolean).join(" — "))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "beeliv-interview.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
