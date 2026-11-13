"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Briefcase, ChevronRight, Clock3 } from "@/components/applicant/icons";
import { HeroCard, IconDisc } from "@/components/shared/premium";
import { TONE } from "@/components/shared/premium/tones";
import { useAttendanceRecords } from "@/lib/client/hooks";
import { todayISO } from "@/lib/client/format";
import { attendanceHref, NEW_REQUEST_HREF } from "@/lib/client/links";
import type { ClientOverview } from "@/lib/client/types";
import { SHIFTS } from "@/lib/client/labels";
import { usePilotHidden } from "@/lib/pilot/context";
import { PersonPhoto } from "../PersonPhoto";
import { AttendanceChip } from "../StatusChip";

/**
 * Phone-only Home for the Client app (hidden from 768px up, where the approved desktop Overview renders unchanged).
 * One hero for what needs attention, a short task list, two big tiles, then a short "on shift" list with View all.
 * Real data only: everything comes from the same Overview / attendance hooks the desktop cards use.
 */
export function PhoneHome({ ov }: { ov: ClientOverview }) {
  const hidden = usePilotHidden();
  const items = ov.attention.filter((i) => !hidden(i.href));
  const [first, ...rest] = items;
  const today = todayISO();
  const { data } = useAttendanceRecords(today, today);
  const onShift = useMemo(() => (data ?? []).filter((r) => r.clockIn !== null), [data]);
  const attHidden = hidden(attendanceHref());

  return (
    <div className="flex flex-col gap-5 min-[768px]:hidden">
      <header>
        <h1 className="ap-serif text-[28px] leading-[1.1]">Welcome, {ov.greetingName}</h1>
        <span className="mt-2 inline-flex max-w-full items-center truncate rounded-full bg-(--ap-tint) px-3 py-1 text-[13px] font-semibold text-(--ap-ink-2)">{ov.scopeLabel}</span>
      </header>

      <HeroCard eyebrow={items.length === 0 ? "All clear" : items.length === 1 ? "1 thing needs you" : `${items.length} things need you`} title={first ? first.title : "You're all caught up"}>
        {first?.detail ? <p className="mt-1 text-[14px] opacity-85">{first.detail}</p> : <p className="mt-1 text-[14px] opacity-85">Nothing needs your attention right now.</p>}
        <Link href={first ? first.href : NEW_REQUEST_HREF} className="mt-3.5 inline-flex h-11 items-center rounded-full bg-white px-5 text-[14px] font-bold text-(--ap-violet)">
          {first ? "Review" : "Request staff"}
        </Link>
      </HeroCard>

      {rest.length > 0 ? (
        <section aria-label="More to do" className="flex flex-col gap-2">
          {rest.slice(0, 3).map((it) => (
            <Link key={it.id} href={it.href} className="flex min-h-14 items-center gap-3 rounded-[16px] border border-(--ap-line) bg-(--ap-surface) px-4 py-2.5">
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block truncate text-[14.5px] font-semibold text-(--ap-ink)">{it.title}</b>
                {it.detail ? <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">{it.detail}</span> : null}
              </span>
              <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-(--ap-tint) px-3 text-[13px] font-bold text-(--ap-violet)">Open</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section aria-label="At a glance" className="grid grid-cols-2 gap-3">
        {attHidden ? null : (
          <Link href={attendanceHref({ date: "today" })} className={`flex min-h-[132px] flex-col justify-between rounded-[22px] p-4 ${TONE.sand}`}>
            <IconDisc icon={Clock3} size={40} />
            <span>
              <b className="block text-[32px] leading-none font-bold text-(--ap-ink) tabular-nums">{ov.checkedIn}</b>
              <span className="mt-1 flex items-center justify-between text-[13.5px] font-semibold text-(--ap-ink-2)">
                On shift today <ChevronRight className="size-4" aria-hidden="true" />
              </span>
            </span>
          </Link>
        )}
        <Link href="/client/recruitment" className={`flex min-h-[132px] flex-col justify-between rounded-[22px] p-4 ${TONE.lavender} ${attHidden ? "col-span-2" : ""}`}>
          <IconDisc icon={Briefcase} size={40} />
          <span>
            <b className="block text-[32px] leading-none font-bold text-(--ap-ink) tabular-nums">{ov.metrics.openPositions}</b>
            <span className="mt-1 flex items-center justify-between text-[13.5px] font-semibold text-(--ap-ink-2)">
              Open positions <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </span>
        </Link>
      </section>

      {attHidden || onShift.length === 0 ? null : (
        <section aria-label="Staff on shift">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[16px] font-bold">On shift now</h2>
            <Link href={attendanceHref({ date: "today", status: "checked-in" })} className="inline-flex min-h-11 items-center text-[13.5px] font-bold text-(--ap-violet)">
              View all
            </Link>
          </div>
          <ul className="m-0 flex list-none flex-col rounded-[16px] border border-(--ap-line) bg-(--ap-surface) p-0 px-3.5">
            {onShift.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-(--ap-line-2) py-2.5 first:border-t-0">
                <PersonPhoto name={r.staffName} size={38} />
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[15px]">{r.staffName}</b>
                  <span className="block truncate text-[13px] text-(--ap-muted)">
                    {r.role} &middot; {SHIFTS[r.shift].label}
                  </span>
                </span>
                <AttendanceChip status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
