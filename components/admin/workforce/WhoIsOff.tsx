"use client";

/**
 * "Who's off" tab on the Leave page. Approved leave only, over a range the HR
 * user can move through: next 7 days (default), this week, this month, or a
 * chosen month, with back / forward arrows. Past days read quieter and carry a
 * "Taken" marker; today is lightly highlighted. A "Find a person" box turns the
 * list into that person's leave across the range. Scope (which clients' staff
 * appear) is applied by the adapter exactly as on the rest of the Leave page.
 * Reused: FilterDropdown, DatePicker, SearchField, ShowMore, EmptyState.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { ShowMore, SHOW_MORE_STEP } from "@/components/admin/ShowMore";
import { DatePicker } from "@/components/applicant/form-fields";
import { FilterDropdown } from "@/components/applicant/FilterTabs";
import { ChevronLeft, ChevronRight, DoorOpen } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";
import { EmptyState } from "@/components/applicant/primitives";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { addDays, monthYear, parseDate, periodLabel, startOfWeek, toISODate, todayISO } from "@/lib/client/format";
import { useTimeOff } from "@/lib/admin/workforce/hooks";
import { formatDate } from "@/lib/applicant/time";
import type { TimeOffEntry, TimeOffResult } from "@/lib/admin/workforce/types";
import { leaveRange, staffHref, useSearchCommit } from "./parts";

type Kind = "next7" | "week" | "month" | "pick";
const KINDS: { key: Kind; label: string }[] = [
  { key: "next7", label: "Next 7 days" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "pick", label: "Choose a month" },
];

const firstOfMonth = (d: string) => `${d.slice(0, 7)}-01`;
const shiftMonth = (first: string, n: number) => {
  const x = parseDate(first);
  return toISODate(new Date(x.getFullYear(), x.getMonth() + n, 1));
};
const lastOfMonth = (first: string) => addDays(shiftMonth(first, 1), -1);
const shortName = (n: string) => n.replace(" Sample", "");
const daysText = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

function startFor(kind: Kind, today: string) {
  return kind === "next7" ? today : kind === "week" ? startOfWeek(today) : firstOfMonth(today);
}

export function WhoIsOff({ onViewRequest }: { onViewRequest: (id: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const today = todayISO();
  const [kind, setKind] = useState<Kind>("next7");
  const [anchor, setAnchor] = useState(today);
  const [shown, setShown] = useState(SHOW_MORE_STEP);
  const [term, setTerm] = useState("");
  const search = useSearchCommit((v) => {
    setTerm(v);
    setShown(SHOW_MORE_STEP);
  });

  const monthly = kind === "month" || kind === "pick";
  const from = anchor;
  const to = monthly ? lastOfMonth(anchor) : addDays(anchor, 6);

  const live = useTimeOff({ from, to, search: term });
  const [last, setLast] = useState<TimeOffResult | null>(null);
  if (live.data && live.data !== last) setLast(live.data);
  const data = live.data ?? last;
  const refreshing = live.status === "loading";

  function choose(k: Kind) {
    setKind(k);
    setAnchor(startFor(k, today));
    setShown(SHOW_MORE_STEP);
  }
  function step(dir: 1 | -1) {
    setAnchor(monthly ? shiftMonth(anchor, dir) : addDays(anchor, 7 * dir));
    setShown(SHOW_MORE_STEP);
  }

  const past = to < today;
  const future = from > today;
  const verb = past ? "was off" : future ? "will be off" : "is off";
  const atStart = anchor === startFor(kind, today);
  const title = monthly ? `Who ${verb} in ${monthYear(anchor)}` : kind === "next7" && atStart ? "Who is off in the next 7 days" : kind === "week" && atStart ? "Who is off this week" : `Who ${verb}, ${periodLabel(from, to)}`;
  const rangeText = monthly ? `${leaveRange(from, to)}` : `${periodLabel(from, to)}`;
  const searching = term !== "";

  const withPeople = data ? data.days.filter((d) => d.people.length > 0) : [];
  const rows = monthly || searching ? withPeople : (data?.days ?? []);
  const none = (!searching && withPeople.length === 0) || (searching && (data?.entries.length ?? 0) === 0);

  const arrow = "ap-hit inline-flex size-10 items-center justify-center rounded-full border border-(--ap-line) text-(--ap-ink-2) transition-colors hover:bg-(--ap-tint-soft) disabled:opacity-40";

  return (
    <section aria-label="Who is off" className="ap-card rounded-[20px] p-4 min-[768px]:p-5">
      <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold text-(--ap-ink)" aria-live="polite">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-(--ap-muted)">
            {rangeText} · Approved leave only
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={arrow} aria-label={monthly ? "Previous month" : "Previous 7 days"} onClick={() => step(-1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={arrow} aria-label={monthly ? "Next month" : "Next 7 days"} onClick={() => step(1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <FilterDropdown label="Time range" prefix="Show" options={KINDS} current={KINDS.find((k) => k.key === kind)!} onChange={choose} />
          {kind === "pick" ? (
            <div className="w-44">
              <DatePicker id="off-month" mode="month" title="Choose a month" value={anchor.slice(0, 7)} onChange={(v) => v && (setAnchor(firstOfMonth(`${v}-01`)), setShown(SHOW_MORE_STEP))} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 max-w-[420px]">
        <SearchBar className="" search={{ value: search.text, onChange: search.onChange, label: "Find a person", placeholder: "Find a person" }} />
      </div>

      <div className={`mt-3 transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {live.status === "error" || live.status === "restricted" ? (
          <p className="py-6 text-center text-[14px] text-(--ap-muted)">
            We could not load leave for this period.{" "}
            <button type="button" onClick={live.retry} className="font-bold text-(--ap-violet)">
              Try again
            </button>
          </p>
        ) : !data ? (
          <p className="py-6 text-center text-[14px] text-(--ap-muted)">Loading...</p>
        ) : none ? (
          <div className="py-4">
            <EmptyState
              icon={DoorOpen}
              title={searching ? `No leave found for "${term}"` : past ? "No one was off in this period" : future ? "No one is booked off in this period" : "No one is off in this period"}
              description={searching ? "Check the spelling, or move to another period." : "Approved leave shows here. Move to another period to look further."}
            />
          </div>
        ) : searching ? (
          <>
            <ul className="m-0 flex list-none flex-col p-0">
              {data.entries.slice(0, shown).map((e) => {
                const taken = e.endDate < today;
                return (
                  <li key={e.id} className="flex flex-col gap-0.5 border-t border-(--ap-line-2) py-3 first:border-t-0 min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-4">
                    <button type="button" onClick={() => setOpenId(e.id)} aria-haspopup="dialog" className={`min-w-0 flex-1 truncate text-left text-[14px] font-bold hover:text-(--ap-violet) ${taken ? "text-(--ap-muted)" : "text-(--ap-ink)"}`}>
                      {shortName(e.staff.name)}
                      <span className="ml-2 text-[12px] font-normal text-(--ap-faint)">{e.outlet}</span>
                    </button>
                    <span className="text-[13px] text-(--ap-muted)">{e.type}</span>
                    <span className="w-44 text-[13px] text-(--ap-ink-2) tabular-nums min-[640px]:text-right">
                      {leaveRange(e.startDate, e.endDate)} · {daysText(e.days)}
                    </span>
                    <Marker state={taken ? "taken" : "off"} />
                  </li>
                );
              })}
            </ul>
            <ShowMore shown={shown} total={data.entries.length} onMore={() => setShown((n) => n + SHOW_MORE_STEP)} />
          </>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col p-0">
              {rows.slice(0, monthly ? shown : undefined).map((d) => {
                const isToday = d.date === today;
                const isPast = d.date < today;
                const label = isToday ? "Today" : d.date === addDays(today, 1) ? "Tomorrow" : leaveRange(d.date, d.date);
                return (
                  <li
                    key={d.date}
                    className={`flex flex-col gap-1.5 border-t border-(--ap-line-2) px-2 py-2.5 first:border-t-0 min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-4 ${isToday ? "rounded-xl border-t-transparent bg-(--ap-tint-soft)" : ""}`}
                  >
                    <p className={`w-32 shrink-0 text-[14px] ${isPast ? "font-semibold text-(--ap-muted)" : "font-bold text-(--ap-ink)"}`}>{label}</p>
                    {d.people.length === 0 ? (
                      <p className="flex-1 text-[14px] text-(--ap-faint)">No one is off</p>
                    ) : (
                      <ul className="m-0 flex flex-1 list-none flex-wrap gap-2 p-0">
                        {d.people.map((p) => (
                          <li key={p.requestId}>
                            <button
                              type="button"
                              onClick={() => setOpenId(p.requestId)}
                              aria-haspopup="dialog"
                              aria-label={`${shortName(p.name)}, ${p.type}. Show details`}
                              className={`ap-hit rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${isPast ? "bg-(--ap-tint-soft) text-(--ap-muted) hover:bg-(--ap-tint)" : "bg-(--ap-tint) text-(--ap-violet) hover:brightness-95"}`}
                            >
                              {shortName(p.name)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {d.people.length > 0 ? (
                      <span className="flex items-center gap-3 min-[640px]:justify-end">
                        {monthly ? <span className="text-[12px] text-(--ap-muted)">{d.people.length} off</span> : null}
                        <Marker state={isPast ? "taken" : "off"} />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {monthly ? <ShowMore shown={shown} total={rows.length} onMore={() => setShown((n) => n + SHOW_MORE_STEP)} /> : null}
          </>
        )}
      </div>
      {openId && data?.entries.find((e) => e.id === openId) ? (
        <LeaveDetail entry={data.entries.find((e) => e.id === openId)!} today={today} onClose={() => setOpenId(null)} onViewRequest={() => (setOpenId(null), onViewRequest(openId))} />
      ) : null}
    </section>
  );
}

/** Compact detail for one approved leave. Leave type only: the reason (may be medical) is never shown here. Bottom sheet on phones, centred card from tablet up. */
function LeaveDetail({ entry: e, today, onClose, onViewRequest }: { entry: TimeOffEntry; today: string; onClose: () => void; onViewRequest: () => void }) {
  const isClient = useIsClient();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => back?.focus?.();
  }, []);
  if (!isClient) return null;
  const status = e.endDate < today ? "Approved, taken" : e.startDate > today ? "Approved, upcoming" : "Approved, in progress";
  const rows: [string, string][] = [
    ["Leave type", e.type],
    ["Dates", e.startDate === e.endDate ? leaveRange(e.startDate, e.endDate) : `${leaveRange(e.startDate, e.endDate)} (${daysText(e.days)})`],
    ["Status", status],
    ["Approved by", e.decidedBy ? `${e.decidedBy}${e.decidedAt ? `, ${formatDate(e.decidedAt)}` : ""}` : "Not recorded"],
  ];
  return createPortal(
    <div
      className={`${ADMIN_THEME} fixed inset-0 z-[150] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.35)" }}
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
      onKeyDown={(ev) => ev.key === "Escape" && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) shadow-xl min-[768px]:w-[460px] min-[768px]:rounded-[22px] min-[768px]:p-6">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15]">
          {shortName(e.staff.name)}
        </h2>
        <p className="mt-1 text-[13px] text-(--ap-muted)">
          {e.client}, {e.outlet}
        </p>
        <dl className="mt-4 flex flex-col">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-t border-(--ap-line-2) py-2.5 text-[14px] first:border-t-0">
              <dt className="text-(--ap-muted)">{k}</dt>
              <dd className="text-right font-semibold text-(--ap-ink-2)">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-col-reverse gap-3 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-end">
          <button ref={closeRef} type="button" onClick={onClose} className="ap-btn ap-btn-s h-11 px-5 min-[768px]:mr-auto">
            Close
          </button>
          <span className="flex flex-col-reverse items-stretch gap-3 text-center min-[768px]:flex-row min-[768px]:items-center">
            <Link href={staffHref(e.staff.id) + "?tab=leave"} className="ap-hit text-[14px] font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum)">
              View staff profile
            </Link>
            <button type="button" onClick={onViewRequest} className="ap-btn ap-btn-p h-11 px-5 text-white!">
              View full request
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Marker({ state }: { state: "taken" | "off" }) {
  return <span className={`w-12 shrink-0 text-[12px] font-semibold ${state === "taken" ? "text-(--ap-faint)" : "text-(--ap-muted)"}`}>{state === "taken" ? "Taken" : "Off"}</span>;
}
