"use client";

/**
 * "By HR officer" table, shown ONLY when the scope is "all" (Operations), so
 * management can rebalance work. HR users never see this. The workload chip
 * is relative to the average officer; the rule needs Beeliv confirmation.
 * Reused: ListCard + listKit table classes, StatusChip, ShowMore.
 */
import { BODY_ROW, CARD_ITEM, CARD_LIST, HEAD_ROW, ListCard, TH, useBatch } from "@/components/admin/listKit";
import { ShowMore } from "@/components/admin/ShowMore";
import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import type { GlanceHrRow, Workload } from "@/lib/admin/glance/types";

const GRID = "grid grid-cols-[minmax(0,2fr)_90px_90px_90px_100px_110px] items-center gap-3";
const TONE: Record<Workload, ChipTone> = { Light: "info", Balanced: "ok", Heavy: "bad" };

export function ByHrTable({ rows }: { rows: GlanceHrRow[] }) {
  const { limit, more } = useBatch("by-hr");
  const shown = rows.slice(0, limit);
  return (
    <ListCard showTitle title="By HR officer" summary="Workload is compared with the average officer.">
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-(--ap-muted)">No HR officers are assigned to clients yet.</p>
      ) : (
        <>
          <div className="max-[767px]:hidden">
            <div className={`${GRID} ${HEAD_ROW}`}>
              <span className={TH}>HR officer</span>
              <span className={`${TH} text-right`}>Clients</span>
              <span className={`${TH} text-right`}>Open jobs</span>
              <span className={`${TH} text-right`}>Waiting</span>
              <span className={`${TH} text-right`}>Placed</span>
              <span className={TH}>Workload</span>
            </div>
            {shown.map((r) => (
              <div key={r.id} className={`${GRID} ${BODY_ROW}`}>
                <b className="truncate text-[14px]">{r.name}</b>
                <span className="text-right text-[14px] tabular-nums">{r.clients}</span>
                <span className="text-right text-[14px] tabular-nums">{r.openJobs}</span>
                <span className="text-right text-[14px] tabular-nums">{r.requestsWaiting}</span>
                <span className="text-right text-[14px] tabular-nums">{r.placementsMonth}</span>
                <span>
                  <StatusChip tone={TONE[r.workload]}>{r.workload}</StatusChip>
                </span>
              </div>
            ))}
          </div>
          <ul className={`${CARD_LIST} min-[768px]:hidden`}>
            {shown.map((r) => (
              <li key={r.id} className={CARD_ITEM}>
                <span className="flex items-center justify-between gap-2">
                  <b className="text-[14px]">{r.name}</b>
                  <StatusChip tone={TONE[r.workload]}>{r.workload}</StatusChip>
                </span>
                <span className="mt-1 block text-[13px] text-(--ap-muted)">
                  {r.clients} clients, {r.openJobs} open jobs, {r.requestsWaiting} waiting, {r.placementsMonth} placed this month
                </span>
              </li>
            ))}
          </ul>
          <ShowMore shown={shown.length} total={rows.length} onMore={more} />
        </>
      )}
      <p className="mt-3 text-[11px] text-(--ap-muted)">Workload rule needs Beeliv confirmation.</p>
    </ListCard>
  );
}
