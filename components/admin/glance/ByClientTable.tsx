"use client";

/**
 * "By client" table. Reused: ListCard + listKit table classes, StatusChip,
 * AttentionBadge, ShowMore. A client with nobody assigned shows a RED
 * "No HR assigned" chip so management can fix it. Table from 768px, stacked
 * rows below.
 */
import Link from "next/link";
import { BODY_ROW, CARD_ITEM, CARD_LIST, HEAD_ROW, ListCard, TH, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { StatusChip } from "@/components/client/StatusChip";
import type { GlanceClientRow } from "@/lib/admin/glance/types";

const GRID = "grid grid-cols-[minmax(0,2fr)_80px_90px_100px_minmax(0,1.5fr)_110px] items-center gap-3";

function HrCell({ hr }: { hr: string | null }) {
  if (hr) return <span className="truncate text-[14px]">{hr}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-(--ap-rose)">
      <AttentionBadge className="size-5" halo={false} />
      No HR assigned
    </span>
  );
}

export function ByClientTable({ rows }: { rows: GlanceClientRow[] }) {
  const { limit, more } = useBatch("by-client");
  const shown = rows.slice(0, limit);
  const missing = rows.filter((r) => !r.hr).length;
  return (
    <ListCard showTitle title="By client" summary={missing ? `${missing} client${missing === 1 ? "" : "s"} with no HR assigned` : `${rows.length} client${rows.length === 1 ? "" : "s"}`}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-(--ap-muted)">No clients yet.</p>
      ) : (
        <>
          <div className="max-[767px]:hidden">
            <div className={`${GRID} ${HEAD_ROW}`}>
              <span className={TH}>Client</span>
              <span className={`${TH} text-right`}>Open jobs</span>
              <span className={`${TH} text-right`}>Waiting</span>
              <span className={`${TH} text-right`}>Placed</span>
              <span className={TH}>Assigned HR</span>
              <span className={TH}>Status</span>
            </div>
            {shown.map((r) => (
              <Link key={r.id} href={r.href} className={`${GRID} ${BODY_ROW} ${r.hr ? "" : "bg-(--ap-rose-bg)/40"}`}>
                <b className="truncate text-[14px]">{r.name}</b>
                <span className="text-right text-[14px] tabular-nums">{r.openJobs}</span>
                <span className={`text-right text-[14px] tabular-nums ${r.requestsWaiting ? "font-bold text-(--ap-warn)" : ""}`}>{r.requestsWaiting}</span>
                <span className="text-right text-[14px] tabular-nums">{r.placementsMonth}</span>
                <HrCell hr={r.hr} />
                <span>
                  <StatusChip tone={r.statusTone}>{r.statusLabel}</StatusChip>
                </span>
              </Link>
            ))}
          </div>
          <ul className={`${CARD_LIST} min-[768px]:hidden`}>
            {shown.map((r) => (
              <li key={r.id} className={CARD_ITEM}>
                <Link href={r.href} className="block">
                  <span className="flex items-center justify-between gap-2">
                    <b className="text-[14px]">{r.name}</b>
                    <StatusChip tone={r.statusTone}>{r.statusLabel}</StatusChip>
                  </span>
                  <span className="mt-1 block text-[13px] text-(--ap-muted)">
                    {r.openJobs} open jobs, {r.requestsWaiting} waiting, {r.placementsMonth} placed this month
                  </span>
                  <span className="mt-1 block">
                    <HrCell hr={r.hr} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <ShowMore shown={shown.length} total={rows.length} onMore={more} />
        </>
      )}
    </ListCard>
  );
}
