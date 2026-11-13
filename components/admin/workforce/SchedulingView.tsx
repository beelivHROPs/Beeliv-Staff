"use client";

/**
 * Scheduling (HR authoring): week roster per client / outlet. HR creates and
 * edits shifts, copies last week, publishes and unpublishes the week. Staff
 * (and the Client, read-only) see ONLY published shifts, so unpublished work
 * is clearly marked (Draft / Changed / Removing) with a week-level count.
 * Every schedule and shift shows who created it and who last edited it; the
 * week shows who published it. Who may create and publish schedules is not in
 * the spec (24.6 only has the Client viewing) and needs Beeliv confirmation:
 * the adapter's canCreateSchedule / canPublishSchedule flags decide which
 * controls show, and the prototype switch previews HR Officer vs HR Manager.
 * The Staff app has no swap or cover-request screen, so none is built here.
 * Reused: FilterTabs not needed; FilterSelect, StatusChip, confirmAction,
 * NoticeBanner (interviews), Disc, EmptyState, ErrorPanel, AdminAvatar.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { QUIET_ICON_BTN } from "@/components/admin/standard/MoreMenu";
import { NoticeBanner, type Notice } from "@/components/admin/interviews/ui";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Calendar, ChevronLeft, ChevronRight, Exclaim, Pencil, Plus, Repeat, Trash2 } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { FilterSelect } from "@/components/client/records-filters";
import { addDays, dayMonth, parseDate, startOfWeek, todayISO, weekday } from "@/lib/client/format";
import { copyLastWeek, publishWeek, removeShift, unpublishWeek, useSchedule } from "@/lib/admin/workforce/hooks";
import type { SchedulePage, ShiftRow, ShiftState, WeekRoster } from "@/lib/admin/workforce/types";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { HistoryList, range, staffHref, stamp } from "./parts";
import { EmptyCard, FailurePanel, ListSkeleton } from "./states";
import { ShiftSheet } from "./ShiftSheet";
import { PhoneScheduling } from "./PhoneScheduling";

/** Quiet marker: a small dot plus the word (the chip was heavy once a day holds several shifts). */
const STATE_MARK: Record<ShiftState, { dot: string; label: string } | null> = {
  published: null,
  draft: { dot: "bg-(--ap-amber,#c98a1b)", label: "Draft" },
  changed: { dot: "bg-(--ap-violet)", label: "Changed" },
  removing: { dot: "bg-(--ap-rose)", label: "Removing" },
};

export function SchedulingView() {
  const [query, setQuery] = useState({ outletId: "", weekStart: startOfWeek(todayISO()) });
  const live = useSchedule(query);
  const [shown, setShown] = useState<SchedulePage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sheet, setSheet] = useState<{ shift: ShiftRow | null; date: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (live.status === "error" || live.status === "restricted") return <FailurePanel status={live.status} title="Scheduling" what="Scheduling" retry={live.retry} />;
  if (!page) return <ListSkeleton title="Scheduling" rows={3} />;
  if (page.workspaceEmpty || !page.roster) {
    return (
      <>
        <PageHeading title="Scheduling" />
        <EmptyCard icon={Calendar} title="No outlets to schedule yet" description="Once you are assigned clients and outlets, you can build and publish their weekly rosters here." />
      </>
    );
  }
  const roster: WeekRoster = page.roster;
  const setRoster = (r: WeekRoster) => live.setData({ ...page, roster: r });
  const weekEnd = addDays(roster.weekStart, 6);
  const refreshing = live.status === "loading";
  const outletOptions = page.facets.outlets.filter((o) => o.clientId === page.facets.outlets.find((x) => x.id === roster.outletId)?.clientId);
  const clientId = page.facets.outlets.find((o) => o.id === roster.outletId)?.clientId ?? "";

  async function run(work: () => Promise<WeekRoster>, ok: string, fail: string) {
    setBusy(true);
    try {
      setRoster(await work());
      setNotice({ kind: "ok", text: ok });
    } catch {
      setNotice({ kind: "error", text: fail });
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    const n = roster.unpublishedCount;
    const ok = await confirmAction({
      tone: "neutral",
      title: `Publish the week of ${dayMonth(roster.weekStart)} for ${roster.outlet}?`,
      description: "Staff and the Client can see the shifts once this is published.",
      points: [`${n} unpublished ${n === 1 ? "change becomes" : "changes become"} visible.`, "Shifts marked Removing are taken off the roster.", "Your name and the time are written to the week's history."],
      confirmLabel: "Publish week",
    });
    if (ok) await run(() => publishWeek(roster.outletId, roster.weekStart), "The week was published. Staff can now see it.", "We could not publish the week. Nothing was changed. Please try again.");
  }

  async function onUnpublish() {
    const ok = await confirmAction({
      tone: "caution",
      title: `Unpublish the week of ${dayMonth(roster.weekStart)}?`,
      description: "Staff and the Client no longer see this week.",
      points: ["Every shift goes back to a draft you can edit.", "You can publish it again at any time.", "Your name and the time are written to the week's history."],
      confirmLabel: "Unpublish week",
    });
    if (ok) await run(() => unpublishWeek(roster.outletId, roster.weekStart), "The week was unpublished. Staff no longer see it.", "We could not unpublish the week. Nothing was changed. Please try again.");
  }

  async function onCopy() {
    const ok = await confirmAction({
      tone: "neutral",
      title: "Copy last week's shifts into this week?",
      description: "Last week's shifts are added here as drafts, a week later.",
      points: ["Nothing is overwritten: a person who already has a shift that day keeps it.", "Copied shifts stay hidden from staff until you publish."],
      confirmLabel: "Copy last week",
    });
    if (ok) await run(() => copyLastWeek(roster.outletId, roster.weekStart), "Last week's shifts were copied as drafts.", "We could not copy last week. Nothing was changed. Please try again.");
  }

  async function onRemove(s: ShiftRow) {
    const wasPublished = s.state !== "draft";
    const ok = await confirmAction({
      tone: "danger",
      title: `Remove ${s.staff.name}'s shift?`,
      description: `${dayMonth(s.date)}, ${range(s.start, s.end)}.`,
      points: wasPublished ? ["Staff still see it until you publish the week.", "It is then taken off the roster."] : ["This draft has not been published, so it is deleted."],
      confirmLabel: "Remove shift",
      cancelLabel: "Keep shift",
    });
    if (ok) await run(() => removeShift(roster.outletId, s.id), "The shift was removed.", "We could not remove the shift. Nothing was changed. Please try again.");
  }

  const showPublish = roster.canPublishSchedule && roster.unpublishedCount > 0;
  const days = Array.from({ length: 7 }, (_, i) => addDays(roster.weekStart, i));
  const today = todayISO();

  const statusLine = roster.unpublishedCount > 0
    ? { dot: "bg-amber-500", text: `${roster.unpublishedCount} ${roster.unpublishedCount === 1 ? "change is" : "changes are"} not published yet. Staff cannot see ${roster.unpublishedCount === 1 ? "it" : "them"} until you publish.` }
    : roster.published
      ? { dot: "bg-emerald-500", text: "Published. Staff and the Client can see this week." }
      : { dot: "bg-(--ap-faint)", text: "Nothing to publish yet." };

  return (
    <div>
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      <PhoneScheduling
        roster={roster}
        facets={page.facets}
        busy={busy}
        refreshing={refreshing}
        onWeek={(dir) => setQuery((q) => ({ ...q, weekStart: addDays(q.weekStart, 7 * dir) }))}
        onClient={(v) => setQuery((q) => ({ ...q, outletId: page.facets.outlets.find((o) => o.clientId === v)?.id ?? q.outletId }))}
        onOutlet={(v) => setQuery((q) => ({ ...q, outletId: v }))}
        onAdd={(d) => setSheet({ shift: null, date: d })}
        onEdit={(s) => setSheet({ shift: s, date: s.date })}
        onRemove={(s) => void onRemove(s)}
        onPublish={() => void onPublish()}
        onUnpublish={() => void onUnpublish()}
        onCopy={() => void onCopy()}
      />
      <div className="max-[767px]:hidden">
      <PageHeading
        title="Scheduling"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {roster.canCreateSchedule ? (
              <button type="button" disabled={busy} onClick={() => setSheet({ shift: null, date: today >= roster.weekStart && today <= weekEnd ? today : roster.weekStart })} className={`ap-btn h-11 ${showPublish ? "ap-btn-s" : "ap-btn-p text-white!"}`}>
                <Plus className="size-4" aria-hidden="true" /> Add shift
              </button>
            ) : null}
            {showPublish ? (
              <button type="button" disabled={busy} onClick={() => void onPublish()} className="ap-btn ap-btn-p h-11 text-white!">
                Publish week
              </button>
            ) : null}
            <MoreMenu
              disabled={busy}
              items={[
                ...(roster.canCreateSchedule && roster.canCopyLastWeek ? [{ label: "Copy last week", icon: Repeat, onSelect: () => void onCopy() }] : []),
                ...(roster.canPublishSchedule && roster.published ? [{ label: "Unpublish this week", icon: Calendar, onSelect: () => void onUnpublish() }] : []),
              ]}
            >
              <p className="text-[13px] leading-relaxed text-(--ap-muted)">
                Created by {roster.createdBy}, {stamp(roster.createdAt)}. Last edited by {roster.lastEditedBy}, {stamp(roster.lastEditedAt)}.
                {roster.lastPublishedAt ? ` Published by ${roster.lastPublishedBy}, ${stamp(roster.lastPublishedAt)}.` : " Never published."}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-(--ap-muted)">Staff and the Client see only published shifts. Who may create and publish schedules needs Beeliv confirmation.</p>
              {!roster.canPublishSchedule ? <p className="mt-2 text-[13px] leading-relaxed text-(--ap-ink-2)">Your account can prepare the roster but not publish it. Ask an HR Manager to publish.</p> : null}
              {!roster.canCreateSchedule ? <p className="mt-2 text-[13px] leading-relaxed text-(--ap-ink-2)">Your account can view this roster but not change it.</p> : null}
            </MoreMenu>
          </div>
        }
      />

      <div className="mb-3 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1100px]:grid-cols-[1fr_1fr_auto]">
        <FilterSelect
          label="Client"
          value={clientId}
          onChange={(v) => setQuery((q) => ({ ...q, outletId: page.facets.outlets.find((o) => o.clientId === v)?.id ?? q.outletId }))}
          options={page.facets.clients.map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect label="Outlet" value={roster.outletId} onChange={(v) => setQuery((q) => ({ ...q, outletId: v }))} options={outletOptions.map((o) => ({ value: o.id, label: o.name }))} />
        <div className="flex items-center gap-2 min-[560px]:col-span-2 min-[1100px]:col-span-1">
          <button type="button" aria-label="Previous week" className="ap-btn ap-btn-s h-11 min-w-11" onClick={() => setQuery((q) => ({ ...q, weekStart: addDays(q.weekStart, -7) }))}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p className="min-w-0 flex-1 text-center text-[14px] font-semibold whitespace-nowrap text-(--ap-ink) max-[559px]:text-[13px]" aria-live="polite">
            {dayMonth(roster.weekStart)} - {dayMonth(weekEnd)} {parseDate(weekEnd).getFullYear()}
          </p>
          <button type="button" aria-label="Next week" className="ap-btn ap-btn-s h-11 min-w-11" onClick={() => setQuery((q) => ({ ...q, weekStart: addDays(q.weekStart, 7) }))}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="ap-btn ap-btn-s h-11 shrink-0" onClick={() => setQuery((q) => ({ ...q, weekStart: startOfWeek(todayISO()) }))}>
            This week
          </button>
        </div>
      </div>

      <p className="mb-4 flex items-start gap-2 px-1 text-[13px] leading-snug text-(--ap-muted)">
        <span aria-hidden="true" className={`mt-[5px] size-2 shrink-0 rounded-full ${statusLine.dot}`} />
        <span>{statusLine.text}</span>
      </p>

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {roster.shifts.length === 0 ? (
          <EmptyCard
            icon={Calendar}
            title="No shifts this week"
            description={roster.canCreateSchedule ? "Add shifts one by one, or copy last week to start from it." : "No shifts have been created for this week."}
            action={
              roster.canCreateSchedule ? (
                <span className="flex flex-wrap justify-center gap-2">
                  <button type="button" className="ap-btn ap-btn-p text-white!" onClick={() => setSheet({ shift: null, date: roster.weekStart })}>
                    <Plus className="size-4" aria-hidden="true" /> Add shift
                  </button>
                  {roster.canCopyLastWeek ? (
                    <button type="button" disabled={busy} className="ap-btn ap-btn-s" onClick={() => void onCopy()}>
                      <Repeat className="size-4" aria-hidden="true" /> Copy last week
                    </button>
                  ) : null}
                </span>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 @min-[640px]:grid-cols-2 @min-[1000px]:grid-cols-3 @min-[1400px]:grid-cols-4">
            {days.map((d) => {
              const list = roster.shifts.filter((s) => s.date === d);
              return (
                <section key={d} aria-label={`${weekday(d, "long")} ${dayMonth(d)}`} className={`ap-card min-w-0 rounded-2xl p-3 ${d === today ? "bg-[color-mix(in_srgb,var(--cal-gold)_8%,var(--ap-surface))]" : ""}`}>
                  <h3 className="mb-2.5 flex items-center gap-2 text-[14px] font-bold">
                    <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full text-[14px] font-bold tabular-nums ${d === today ? "bg-(--cal-gold) text-(--cal-gold-ink) shadow-(--ap-shadow)" : "bg-(--ap-line-2) text-(--ap-ink)"}`}>{parseDate(d).getDate()}</span>
                    <span className="flex flex-col leading-tight">
                      <span className="text-[14px] font-bold text-(--ap-ink)">{weekday(d)}{d === today ? <span className="ml-1.5 text-[12px] font-semibold text-(--ap-muted)">Today</span> : null}</span>
                      <span className="text-[12px] font-normal text-(--ap-muted)">{dayMonth(d)}</span>
                    </span>
                    {roster.canCreateSchedule ? (
                      <button type="button" aria-label={`Add shift on ${weekday(d, "long")} ${dayMonth(d)}`} onClick={() => setSheet({ shift: null, date: d })} className="ap-hit ml-auto flex size-8 items-center justify-center rounded-full text-(--ap-muted) transition-colors hover:bg-(--ap-line-2) hover:text-(--ap-ink) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </h3>
                  {list.length === 0 ? (
                    <p className="px-1 py-2 text-[13px] text-(--ap-faint)">No shifts</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {list.map((s) => (
                        <ShiftItem key={s.id} s={s} editable={roster.canCreateSchedule} busy={busy} onEdit={() => setSheet({ shift: s, date: s.date })} onRemove={() => void onRemove(s)} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <details className="mt-5 rounded-2xl border border-(--ap-line-2) px-4 py-3">
        <summary className="cursor-pointer list-none text-[14px] font-semibold text-(--ap-muted) hover:text-(--ap-ink) [&::-webkit-details-marker]:hidden">
          Activity history <span className="font-normal text-(--ap-faint)">({roster.history.length})</span>
        </summary>
        <div className="mt-3">
          <HistoryList history={roster.history} empty="Nothing has happened to this week yet." />
        </div>
      </details>
      </div>

      {sheet ? (
        <ShiftSheet
          roster={roster}
          shift={sheet.shift}
          defaultDate={sheet.date}
          onClose={() => setSheet(null)}
          onSaved={(r, text) => {
            setRoster(r);
            setSheet(null);
            setNotice({ kind: "ok", text });
          }}
          onFailed={(text) => {
            setSheet(null);
            setNotice({ kind: "error", text });
          }}
        />
      ) : null}
    </div>
  );
}

/** One quiet "..." button: secondary actions, the audit lines, the rule note and the prototype switch live here. */
function MoreMenu({ items, disabled, children }: { items: { label: string; icon: typeof Repeat; onSelect: () => void }[]; disabled: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("touchstart", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={wrap} className="relative">
      <button type="button" aria-label="More: schedule details and actions" aria-haspopup="true" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((v) => !v)} className={QUIET_ICON_BTN}>
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div id={id} className="ap-pop-in absolute top-[calc(100%+6px)] right-0 z-40 w-[min(340px,calc(100vw-32px))] rounded-2xl border border-(--ap-line) bg-(--ap-surface) p-2 shadow-(--ap-shadow)">
          {items.length > 0 ? (
            <div role="menu" aria-label="Week actions" className="mb-2 border-b border-(--ap-line-2) pb-2">
              {items.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                    it.onSelect();
                  }}
                  className="flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[15px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2) disabled:opacity-50"
                >
                  <it.icon className="size-4 text-(--ap-muted)" aria-hidden="true" />
                  {it.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="px-3 pt-1 pb-2">{children}</div>
        </div>
      ) : null}
    </div>
  );
}


function ShiftItem({ s, editable, busy, onEdit, onRemove }: { s: ShiftRow; editable: boolean; busy: boolean; onEdit: () => void; onRemove: () => void }) {
  const mark = STATE_MARK[s.state];
  const ghost = "inline-flex size-8 items-center justify-center rounded-full text-(--ap-muted) transition-colors hover:bg-(--ap-line-2) hover:text-(--ap-ink) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none disabled:opacity-50";
  return (
    <li className={`rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) p-3 transition-colors hover:border-(--ap-line) ${s.state === "removing" ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <p className={`text-[14px] font-bold whitespace-nowrap text-(--ap-violet) tabular-nums ${s.state === "removing" ? "line-through" : ""}`}>{range(s.start, s.end)}</p>
          <span className="text-[12px] whitespace-nowrap text-(--ap-faint)">{s.breakMins} min break</span>
        </div>
        {editable && s.state !== "removing" ? (
          <div className="-mt-1 -mr-1 flex shrink-0">
            <button type="button" disabled={busy} onClick={onEdit} aria-label={`Edit ${s.staff.name}'s shift`} title="Edit" className={ghost}>
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
            <button type="button" disabled={busy} onClick={onRemove} aria-label={`Remove ${s.staff.name}'s shift`} title="Remove" className={ghost}>
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      <span className="mt-2 flex items-center gap-2">
        <AdminAvatar name={s.staff.name} photoUrl={s.staff.photoUrl} size={28} />
        <Link href={staffHref(s.staff.id)} className="min-w-0 truncate text-[14px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
          {s.staff.name}
        </Link>
      </span>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] leading-snug text-(--ap-muted)">
        <span className="break-words">
          {s.role}, {s.section}
        </span>
        {mark ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-(--ap-ink-2)">
            <span aria-hidden="true" className={`size-2 rounded-full ${mark.dot}`} />
            {mark.label}
          </span>
        ) : null}
      </p>
      {s.conflicts.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {s.conflicts.map((c) => (
            <span key={`${c.kind}-${c.id}`} title={c.label} className="inline-flex min-h-6 items-center gap-1 rounded-full bg-(--ap-rose-bg) px-2.5 py-0.5 text-[12px] font-bold text-(--ap-rose)">
              <Exclaim className="size-3.5 shrink-0" aria-hidden="true" />
              {c.kind === "double-booking" ? "Double-booked" : "On leave"}
            </span>
          ))}
        </div>
      ) : null}
      {s.conflicts.length > 0 ? <p className="mt-1 text-[12px] text-(--ap-ink-2)">{s.conflicts.map((c) => c.label).join(" ")}</p> : null}
    </li>
  );
}
