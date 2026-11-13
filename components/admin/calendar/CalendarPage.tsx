"use client";

/**
 * /admin/calendar: a calm month calendar. Click a day to see what is planned
 * (side sheet on desktop, bottom sheet on phones). Week, Day and Agenda are behind
 * a quiet "View" select. The richer kit options (drag, slot create, filters,
 * mini-month) stay available in AdminCalendar but are off here.
 * Reused: PageHeading, EmptyState, Client FilterSelect, ErrorPanel, RestrictedPanel.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { FilterSelect } from "@/components/client/records-filters";
import { RestrictedPanel } from "@/components/admin/interviews/ui";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useCalendar } from "@/lib/admin/calendar/hooks";
import { usePilotMenu } from "@/lib/pilot/context";
import { isPilotHiddenRoute } from "@/lib/pilot/menu";
import { playAdminSound } from "@/lib/admin/sound";
import type { CalendarData } from "@/lib/admin/calendar/types";
import { AdminCalendar } from "./AdminCalendar";
import { PhoneCalendar } from "./PhoneCalendar";
import { addDays, addMonths, fmtDayLong, fmtMonth, fmtWeekRange, sameMonth, startOfDay, startOfMonth, startOfWeek } from "./dates";
import type { CalendarView } from "./EventChip";
import { useNow } from "./hooks";
import { onDay, prepare } from "./model";
import { DayAgenda, SideCards, SimpleMonth, TinyLegend } from "./SimpleCalendar";
import { TimelineSide } from "./TimelineView";

// ?schedule=1 makes the Interviews page open its "Schedule interview" pop-up on arrival.
const SCHEDULE_HREF = "/admin/recruitment/interviews?schedule=1";

function CalendarSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading calendar">
      <PageHeading title="Calendar" />
      <div className="ap-card rounded-[20px] p-4.5 min-[768px]:p-5">
        <div className="ap-shimmer mb-4 h-10 w-2/3 rounded-xl" />
        <div className="ap-shimmer h-[420px] rounded-xl" />
      </div>
    </div>
  );
}

export function CalendarPage() {
  const now = useNow();
  const today = useMemo(() => startOfDay(new Date(now)), [now]);
  const [view, setView] = useState<CalendarView>("month");
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [open, setOpen] = useState<Date | null>(null);
  const [dir, setDir] = useState(0);

  const monthStart = startOfMonth(date);
  const range = { from: addDays(monthStart, -14).toISOString(), to: addDays(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1), 46).toISOString() };
  const live = useCalendar(range);
  const [shown, setShown] = useState<CalendarData | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const pilot = usePilotMenu();
  const loaded = live.data ?? shown;
  // Pilot menu: shifts and leave only open later-stage screens, so they are left off the calendar; interviews, deadlines and the rest stay.
  const data = useMemo(() => (pilot && loaded ? { ...loaded, events: loaded.events.filter((e) => !(e.href && isPilotHiddenRoute(e.href))) } : loaded), [pilot, loaded]);
  const [had, setHad] = useState(false);
  if (data && data.events.length > 0 && !had) setHad(true);

  if (live.status === "restricted") return <RestrictedPanel title="Calendar" what="The calendar" />;
  if (live.status === "error") {
    return (
      <>
        <PageHeading title="Calendar" />
        <ErrorPanel title="We could not load the calendar" retry={live.retry} />
      </>
    );
  }
  if (!data) return <CalendarSkeleton />;

  const scheduleBtn = (
    <Link href={SCHEDULE_HREF} className="ap-btn ap-btn-p h-11 text-white!">
      <Plus className="size-4" aria-hidden="true" /> Schedule interview
    </Link>
  );

  if (data.events.length === 0 && !had && live.status !== "loading") {
    return (
      <>
        <PageHeading title="Calendar" right={scheduleBtn} />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Calendar} title="Nothing on the calendar yet" description="Interviews, shifts, leave, vacancy closing dates and deadlines appear here once they are scheduled." action={<Link href={SCHEDULE_HREF} className="ap-btn ap-btn-s ap-btn-sm">Go to Interviews</Link>} />
        </div>
      </>
    );
  }

  const step = (d: -1 | 1) => {
    setDir(d);
    if (view === "week") {
      // Land on today when it is in the new week, else the first day with events, else the first day.
      const ws = startOfWeek(addDays(date, 7 * d));
      const wk = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
      const evs = prepare(data.events, data.types);
      setDate(wk.find((x) => x.getTime() === today.getTime()) ?? wk.find((x) => onDay(evs, x).length > 0) ?? ws);
    } else setDate(view === "month" ? addMonths(date, d) : addDays(date, (view === "day" ? 1 : 7) * d));
    if (view === "month") setOpen(null);
  };
  const title = view === "month" ? fmtMonth(date) : view === "week" ? fmtWeekRange(startOfWeek(date), addDays(startOfWeek(date), 6)) : view === "day" ? `${fmtDayLong(date)} ${date.getFullYear()}` : "Next 30 days";
  const isCurrent = view === "month" ? sameMonth(date, today) : view === "week" ? startOfWeek(date).getTime() === startOfWeek(today).getTime() : date.getTime() === today.getTime();
  const unit = view === "month" ? "month" : view === "day" ? "day" : "week";

  const selectedDay = open ?? today;

  return (
    <div>
      <PageHeading title="Calendar" right={<div className="max-[767px]:hidden">{scheduleBtn}</div>} />
      <PhoneCalendar today={today} events={data.events} types={data.types} scheduleHref={SCHEDULE_HREF} />
      <div className={`max-[767px]:hidden ${view === "month" ? "grid gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_340px] min-[1200px]:items-start" : view === "week" || view === "day" ? "grid gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1200px]:items-start" : ""}`}>
      <section aria-label="Calendar" className="ap-card min-w-0 rounded-[20px] p-4.5 min-[768px]:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => step(-1)} aria-label={`Previous ${unit}`} className="ap-btn ap-btn-s ap-btn-sm size-10 p-0">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={`Next ${unit}`} className="ap-btn ap-btn-s ap-btn-sm size-10 p-0">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <h2 className="font-serif text-[18px] leading-tight font-bold text-(--ap-ink)" aria-live="polite">
              {title}
            </h2>
            <p className="text-[12px] text-(--ap-muted)">Africa/Lagos (WAT)</p>
          </div>
          <button type="button" onClick={() => { setDir(date < today ? 1 : -1); setDate(today); setOpen(null); }} disabled={isCurrent} className="ap-btn ap-btn-s ap-btn-sm h-10">
            Today
          </button>
          <div className="w-[150px]">
            <FilterSelect
              label="View"
              value={view}
              onChange={(v) => setView(v as CalendarView)}
              options={[
                { value: "month", label: "Month" },
                { value: "week", label: "Week" },
                { value: "day", label: "Day" },
                { value: "agenda", label: "Agenda" },
              ]}
            />
          </div>
        </div>

        <div className={live.status === "loading" ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={live.status === "loading"}>
          {view === "month" ? (
            <SimpleMonth month={date} selected={selectedDay} today={today} events={data.events} types={data.types} onSelect={(d) => { playAdminSound("select"); setOpen(d); }} dir={dir} />
          ) : (
            <AdminCalendar chrome="none" events={data.events} types={data.types} view={view} date={date} onViewChange={setView} onDateChange={setDate} emptyAction={<Link href={SCHEDULE_HREF} className="ap-btn ap-btn-p h-11 text-white!"><Plus className="size-4" aria-hidden="true" /> Schedule interview</Link>} />
          )}
        </div>
        {view === "month" ? <DayAgenda day={selectedDay} today={today} events={data.events} types={data.types} scheduleHref={SCHEDULE_HREF} /> : null}
        <div className="mt-4">
          <TinyLegend types={data.types} />
        </div>
      </section>

      {view === "week" || view === "day" ? (
        <div className="hidden min-[1200px]:sticky min-[1200px]:top-24 min-[1200px]:block">
          <TimelineSide date={date} today={today} events={data.events} types={data.types} onSelect={setDate} />
        </div>
      ) : null}
      {view === "month" ? (
        <div className="min-[1200px]:sticky min-[1200px]:top-24">
          <SideCards today={today} events={data.events} types={data.types} scheduleHref={SCHEDULE_HREF} />
        </div>
      ) : null}
      </div>
    </div>
  );
}
