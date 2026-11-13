"use client";

/**
 * Scheduling, PHONE only (<768px): the shared DayTimeline (admin-home-options option D), as on the Admin
 * Calendar. Search card + funnel first, ONE row of tabs (All first), a 5-day strip, a counted "Shifts (N)"
 * heading and one white card per shift, grouped by start time. ONE primary action: "Add shift" (sticky).
 * Tapping a shift opens its detail sheet, which holds edit, remove (cancel) and re-assign (via edit).
 * Week actions (publish, copy, unpublish, who edited) sit behind one quiet "Week options" row.
 * Presentation only: every handler and all data come from SchedulingView (the real scheduling hooks).
 * Desktop keeps the week roster in SchedulingView, unchanged.
 */
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { FilterSheet, ListTabs } from "@/components/admin/listKit";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ChevronLeft, ChevronRight, Plus } from "@/components/applicant/icons";
import { GlassIcon } from "@/components/shared/icons/GlassIcon";
import { DayTimeline, type TimelineEvent } from "@/components/shared/schedule/DayTimeline";
import { FunnelButton, SearchBar } from "@/components/shared/search/SearchCard";
import { addDays, dayMonth, parseDate, todayISO, weekday } from "@/lib/client/format";
import { avatarSlot } from "@/components/admin/AdminAvatar";
import type { ScopeFacets, ShiftRow, ShiftState, WeekRoster } from "@/lib/admin/workforce/types";
import { DANGER_BTN, HistoryList, Sheet, SHEET_BTN, range, staffHref, stamp } from "./parts";

type Tab = "all" | "conflicts" | "unpublished";

const STATE_LABEL: Record<ShiftState, string | null> = { published: null, draft: "Draft", changed: "Changed", removing: "Removing" };
const GRAD = { color: "#fff", backgroundImage: "linear-gradient(135deg,#8b2252,#c24a86)", boxShadow: "0 10px 20px rgba(139,34,82,.28)" } as const;
const ROUND = "flex size-11 shrink-0 items-center justify-center rounded-full bg-(--ap-surface) text-(--ap-ink) shadow-[0_3px_10px_rgba(60,30,80,.08)] active:scale-95";

/** ONE status pill: Conflict (rose) > unpublished state (sand) > Covered (mint). "Open" needs an unassigned-shift concept the data does not have. */
function statusOf(s: ShiftRow): { label: string; kind: "ok" | "wait" | "bad" } {
  if (s.conflicts.length > 0) return { label: "Conflict", kind: "bad" };
  const l = STATE_LABEL[s.state];
  return l ? { label: l, kind: "wait" } : { label: "Covered", kind: "ok" };
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`inline-flex min-h-11 items-center rounded-full px-4 py-1.5 text-left text-[15px] font-semibold ${on ? "text-white shadow-[0_8px_18px_rgba(139,34,82,.28)]" : "border border-(--ap-line) bg-(--ap-surface) text-(--ap-ink)"}`} style={on ? { backgroundImage: "linear-gradient(135deg,#8b2252,#c24a86)" } : undefined}>
      {children}
    </button>
  );
}

export function PhoneScheduling({
  roster,
  facets,
  busy,
  refreshing,
  onWeek,
  onClient,
  onOutlet,
  onAdd,
  onEdit,
  onRemove,
  onPublish,
  onUnpublish,
  onCopy,
}: {
  roster: WeekRoster;
  facets: ScopeFacets;
  busy: boolean;
  refreshing: boolean;
  onWeek: (dir: -1 | 1) => void;
  onClient: (clientId: string) => void;
  onOutlet: (outletId: string) => void;
  onAdd: (date: string) => void;
  onEdit: (s: ShiftRow) => void;
  onRemove: (s: ShiftRow) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onCopy: () => void;
}) {
  const today = todayISO();
  const weekEnd = addDays(roster.weekStart, 6);
  const [picked, setPicked] = useState(today);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [role, setRole] = useState("");
  const [more, setMore] = useState(false);
  const [filters, setFilters] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [weekSheet, setWeekSheet] = useState(false);
  const filterId = useId();

  const sel = picked >= roster.weekStart && picked <= weekEnd ? picked : today >= roster.weekStart && today <= weekEnd ? today : roster.weekStart;
  const clientId = facets.outlets.find((o) => o.id === roster.outletId)?.clientId ?? "";
  const outletOptions = facets.outlets.filter((o) => o.clientId === clientId);

  const needle = q.trim().toLowerCase();
  const matches = useMemo(
    () => roster.shifts.filter((s) => (!role || s.role === role) && (!needle || `${s.staff.name} ${s.role} ${s.section}`.toLowerCase().includes(needle))),
    [roster.shifts, role, needle],
  );
  const tabCounts = { all: matches.length, conflicts: matches.filter((s) => s.conflicts.length > 0).length, unpublished: matches.filter((s) => s.state !== "published").length };
  const inTab = (s: ShiftRow) => (tab === "all" ? true : tab === "conflicts" ? s.conflicts.length > 0 : s.state !== "published");
  const visible = matches.filter(inTab);
  const items = visible.filter((s) => s.date === sel).sort((a, b) => a.start.localeCompare(b.start) || a.staff.name.localeCompare(b.staff.name));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(roster.weekStart, i));
  const winFrom = weekDays.indexOf(sel) >= 5 ? 2 : 0;
  const strip = weekDays.slice(winFrom, winFrom + 5);

  const shown = more ? items : items.slice(0, 5);
  const events = shown.map<TimelineEvent>((s, i) => ({
    id: s.id,
    time: i > 0 && shown[i - 1].start === s.start ? "" : s.start,
    title: s.staff.name,
    meta: `${s.role} · ${roster.outlet}, ${roster.client}`,
    tone: "#8a7ab5",
    av: avatarSlot(s.staff.name),
    face: s.staff.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•",
    status: statusOf(s),
    onOpen: () => setDetail(s.id),
  }));

  const canAdd = roster.canCreateSchedule;
  const active = role ? 1 : 0;
  const shiftWeek = (dir: -1 | 1) => {
    setPicked(addDays(sel, 7 * dir));
    setMore(false);
    onWeek(dir);
  };
  const open = roster.shifts.find((s) => s.id === detail) ?? null;
  const reset = () => setRole("");
  const showPublish = roster.canPublishSchedule && roster.unpublishedCount > 0;
  const canCopy = roster.canCreateSchedule && roster.canCopyLastWeek;
  const hasWeekActions = showPublish || canCopy || (roster.canPublishSchedule && roster.published);

  return (
    <div data-sched-phone="" className={`flex flex-col pb-28 min-[768px]:hidden ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
      <SearchBar
        className="mb-3"
        search={{ value: q, onChange: (v) => { setQ(v); setMore(false); }, label: "Search shifts", placeholder: "Search by name or role" }}
        settleKey={`${role}|${tab}`}
        filterSlot={<FunnelButton count={active} onClick={() => setFilters(true)} expanded={filters} controls={filterId} haspopup="dialog" />}
      />
      <ListTabs
        label="Shifts"
        tabs={[
          { key: "all", label: "All", count: tabCounts.all },
          { key: "conflicts", label: "Conflicts", count: tabCounts.conflicts },
          { key: "unpublished", label: "Unpublished", count: tabCounts.unpublished },
        ]}
        value={tab}
        onChange={(k) => { setTab(k as Tab); setMore(false); }}
      />

      <DayTimeline
        wrap
        days={strip.map((d) => ({ key: d, dow: weekday(d), num: parseDate(d).getDate(), count: visible.filter((s) => s.date === d).length }))}
        selected={sel}
        events={events}
        onSelectDay={(k) => { setPicked(k); setMore(false); }}
        onShift={shiftWeek}
        between={
          <h3 className="mx-0.5 mt-[18px] mb-2.5 flex items-center gap-1.5 text-[17px] font-bold text-(--ap-ink)">
            <span>Shifts</span> <small className="text-[14px] font-bold text-(--ap-muted)">({items.length})</small>
            <span className="ml-auto flex items-center gap-2">
              <button type="button" aria-label="Previous week" onClick={() => shiftWeek(-1)} className={ROUND}>
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Next week" onClick={() => shiftWeek(1)} className={ROUND}>
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </span>
          </h3>
        }
        empty={
          <div className="flex flex-col items-center rounded-[24px] bg-(--ap-surface) px-5 py-7 text-center shadow-[0_8px_24px_rgba(60,30,80,.07)]">
            <GlassIcon name="calendar" size={84} />
            <p className="mt-3 text-[17px] font-bold text-(--ap-ink)">{needle || role || tab !== "all" ? "No shifts match" : "No shifts this day"}</p>
            <p className="mt-1 text-[15px] text-(--ap-muted)">{needle || role || tab !== "all" ? "Try another search or filter." : `${weekday(sel, "long")} ${dayMonth(sel)} has nothing planned.`}</p>
            {canAdd ? (
              <button type="button" disabled={busy} onClick={() => onAdd(sel)} style={GRAD} className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-extrabold">
                <Plus className="size-5" aria-hidden="true" /> Add shift
              </button>
            ) : null}
          </div>
        }
      />
      {!more && items.length > 5 ? (
        <button type="button" onClick={() => setMore(true)} className="mx-auto mt-1 flex h-11 items-center rounded-full bg-(--ap-surface) px-5 text-[15px] font-bold text-(--ap-ink) shadow-[0_6px_16px_rgba(60,30,80,.06)]">
          Show {items.length - 5} more
        </button>
      ) : null}

      <button type="button" onClick={() => setWeekSheet(true)} className="mx-auto mt-3 flex min-h-11 items-center px-4 text-[14px] font-bold text-[#8b2252] dark:text-(--ap-violet)">
        Week options{roster.unpublishedCount > 0 ? ` · ${roster.unpublishedCount} unpublished` : ""}
      </button>

      {canAdd && items.length > 0 ? (
        <div className="pointer-events-none sticky bottom-[calc(104px+env(safe-area-inset-bottom,0px))] z-20 mt-3 flex justify-center">
          <button type="button" disabled={busy} onClick={() => onAdd(sel)} style={GRAD} className="pointer-events-auto flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-extrabold">
            <Plus className="size-5" aria-hidden="true" /> Add shift
          </button>
        </div>
      ) : null}

      <FilterSheet open={filters} id={filterId} active={active} resultCount={visible.length} onClear={reset} onClose={() => setFilters(false)}>
        <div className="flex flex-col gap-5">
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[17px] font-bold text-(--ap-ink)">Client</legend>
            <div className="flex flex-wrap gap-2">
              {facets.clients.map((c) => (
                <Pill key={c.id} on={c.id === clientId} onClick={() => onClient(c.id)}>{c.name}</Pill>
              ))}
            </div>
          </fieldset>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[17px] font-bold text-(--ap-ink)">Outlet</legend>
            <div className="flex flex-wrap gap-2">
              {outletOptions.map((o) => (
                <Pill key={o.id} on={o.id === roster.outletId} onClick={() => onOutlet(o.id)}>{o.name}</Pill>
              ))}
            </div>
          </fieldset>
          {roster.roles.length > 0 ? (
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-2 p-0 text-[17px] font-bold text-(--ap-ink)">Role</legend>
              <div className="flex flex-wrap gap-2">
                <Pill on={role === ""} onClick={() => { setRole(""); setMore(false); }}>All</Pill>
                {roster.roles.map((r) => (
                  <Pill key={r} on={role === r} onClick={() => { setRole(r); setMore(false); }}>{r}</Pill>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      </FilterSheet>

      {open ? (
        <Sheet
          title={open.staff.name}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button type="button" onClick={() => setDetail(null)} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>Close</button>
              {canAdd && open.state !== "removing" ? (
                <button type="button" disabled={busy} onClick={() => { setDetail(null); onRemove(open); }} className={`ap-btn ${DANGER_BTN} ${SHEET_BTN}`}>Cancel shift</button>
              ) : null}
              {canAdd && open.state !== "removing" ? (
                <button type="button" disabled={busy} onClick={() => { setDetail(null); onEdit(open); }} className={`ap-btn ap-btn-p text-white! ${SHEET_BTN}`}>Edit or swap</button>
              ) : null}
            </>
          }
        >
          <div className="flex items-center gap-3">
            <AdminAvatar name={open.staff.name} photoUrl={open.staff.photoUrl} size={44} />
            <div className="min-w-0">
              <p className="text-[16px] font-bold text-(--ap-ink)">{weekday(open.date, "long")} {dayMonth(open.date)}, {range(open.start, open.end)}</p>
              <p className="text-[14px] text-(--ap-muted)">{open.role}, {open.section}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-(--ap-muted)">Where</dt>
            <dd className="m-0 text-(--ap-ink)">{roster.outlet}, {roster.client}</dd>
            <dt className="text-(--ap-muted)">Break</dt>
            <dd className="m-0 text-(--ap-ink)">{open.breakMins} min</dd>
            <dt className="text-(--ap-muted)">Status</dt>
            <dd className="m-0 text-(--ap-ink)">{STATE_LABEL[open.state] ?? "Published"}</dd>
            <dt className="text-(--ap-muted)">Last edit</dt>
            <dd className="m-0 text-(--ap-ink)">{open.lastEditedBy}, {stamp(open.lastEditedAt)}</dd>
          </dl>
          {open.conflicts.length > 0 ? (
            <ul className="mt-4 m-0 flex list-none flex-col gap-1.5 rounded-2xl bg-(--ap-rose-bg) p-3 text-[14px] text-(--ap-rose)">
              {open.conflicts.map((c) => (
                <li key={`${c.kind}-${c.id}`}>{c.label}</li>
              ))}
            </ul>
          ) : null}
          <Link href={staffHref(open.staff.id)} className="mt-4 inline-flex min-h-11 items-center text-[15px] font-bold text-[#8b2252] dark:text-(--ap-violet)">
            Open staff profile
          </Link>
        </Sheet>
      ) : null}

      {weekSheet ? (
        <Sheet
          title={`Week of ${dayMonth(roster.weekStart)}`}
          onClose={() => setWeekSheet(false)}
          footer={
            <>
              <button type="button" onClick={() => setWeekSheet(false)} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>Close</button>
              {hasWeekActions ? (
                <>
                  {canCopy ? (
                    <button type="button" disabled={busy} onClick={() => { setWeekSheet(false); onCopy(); }} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>Copy last week</button>
                  ) : null}
                  {roster.canPublishSchedule && roster.published ? (
                    <button type="button" disabled={busy} onClick={() => { setWeekSheet(false); onUnpublish(); }} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>Unpublish week</button>
                  ) : null}
                  {showPublish ? (
                    <button type="button" disabled={busy} onClick={() => { setWeekSheet(false); onPublish(); }} className={`ap-btn ap-btn-p text-white! ${SHEET_BTN}`}>Publish week</button>
                  ) : null}
                </>
              ) : null}
            </>
          }
        >
          <p className="text-[15px] text-(--ap-ink-2)">
            {roster.unpublishedCount > 0 ? `${roster.unpublishedCount} ${roster.unpublishedCount === 1 ? "change is" : "changes are"} not published yet. Staff cannot see ${roster.unpublishedCount === 1 ? "it" : "them"} until you publish.` : roster.published ? "Published. Staff and the Client can see this week." : "Nothing to publish yet."}
          </p>
          <p className="mt-2 text-[14px] text-(--ap-muted)">
            Created by {roster.createdBy}, {stamp(roster.createdAt)}. Last edited by {roster.lastEditedBy}, {stamp(roster.lastEditedAt)}.
            {roster.lastPublishedAt ? ` Published by ${roster.lastPublishedBy}, ${stamp(roster.lastPublishedAt)}.` : " Never published."}
          </p>
          {!roster.canPublishSchedule ? <p className="mt-2 text-[14px] text-(--ap-ink-2)">Your account can prepare the roster but not publish it. Ask an HR Manager to publish.</p> : null}
          <h3 className="mt-5 mb-2 text-[17px] font-bold text-(--ap-ink)">Activity ({roster.history.length})</h3>
          <HistoryList history={roster.history} empty="Nothing has happened to this week yet." />
        </Sheet>
      ) : null}
    </div>
  );
}
