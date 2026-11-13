"use client";

/**
 * Read-only roles and capabilities view (spec 10, 28.1 "roles/capabilities").
 * Wide containers: a matrix. Narrow: one card per role. A cell the spec and
 * rbac.md do not define reads "Needs Beeliv confirmation", never a guess.
 */
import { EMPTY_CARD } from "@/components/admin/listKit";
import { Restricted } from "@/components/admin/offers/parts";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useAccessMatrix } from "@/lib/admin/team-access/hooks";
import { LEVEL_LABEL, LEVEL_SHORT, LEVEL_TONE } from "./meta";
import { EmptyState } from "@/components/applicant/primitives";
import { ShieldCheck } from "@/components/applicant/icons";

export function RolesMatrix() {
  const live = useAccessMatrix();
  if (live.status === "error") return <ErrorPanel title="We could not load roles and access" retry={live.retry} />;
  if (live.status === "restricted") return <Restricted what="Roles and access" />;
  if (live.status === "empty")
    return (
      <div className={EMPTY_CARD}>
        <EmptyState icon={ShieldCheck} title="No roles to show" description="Roles appear here once they are set up." />
      </div>
    );
  const m = live.data;
  if (!m) return <div role="status" aria-busy="true" aria-label="Loading roles" className="ap-shimmer h-[360px] rounded-2xl" />;
  const cols = { gridTemplateColumns: `minmax(220px,1.6fr) repeat(${m.roles.length},minmax(84px,1fr))` };
  return (
    <div className="@container">
      <div role="table" aria-label="Roles and capabilities" className="ap-card hidden rounded-[20px] @min-[980px]:block">
        <div role="row" style={cols} className={`grid items-end gap-x-3 rounded-t-[20px] border-b border-(--ap-line) bg-(--ap-tint-soft) px-4 py-3`}>
          <span role="columnheader" className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">Capability</span>
          {m.roles.map((r) => (
            <span key={r.id} role="columnheader" className="text-[12px] font-bold text-(--ap-ink-2)">
              {r.name}
            </span>
          ))}
        </div>
        {m.rows.map((row) => (
          <div key={row.key} role="row" style={cols} className={`grid items-center gap-x-3 border-b border-(--ap-line-2) px-4 py-3 last:border-b-0`}>
            <span role="rowheader" className="min-w-0 text-[14px] break-words">
              {row.label}
              <span className="block text-[12px] text-(--ap-muted)">{row.source}</span>
            </span>
            {m.roles.map((r) => (
              <span key={r.id} role="cell" title={LEVEL_LABEL[row.cells[r.id]]}>
                <StatusChip tone={LEVEL_TONE[row.cells[r.id]]}>{LEVEL_SHORT[row.cells[r.id]]}</StatusChip>
              </span>
            ))}
          </div>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 @min-[980px]:hidden">
        {m.roles.map((r) => (
          <li key={r.id} className="ap-card rounded-2xl p-4">
            <h3 className="text-[17px] leading-tight font-bold">{r.name}</h3>
            <p className="mt-1 text-[13px] leading-snug text-(--ap-muted)">{r.summary}</p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {m.rows.map((row) => (
                <li key={row.key} className="flex items-start justify-between gap-3 text-[14px]">
                  <span className="min-w-0 break-words text-(--ap-ink-2)">{row.label}</span>
                  <StatusChip tone={LEVEL_TONE[row.cells[r.id]]}>{LEVEL_SHORT[row.cells[r.id]]}</StatusChip>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-snug text-(--ap-muted)">
        Read-only. Yes = stated in the spec; Scoped = only within assigned clients and outlets; TBC = Needs Beeliv confirmation (not defined in the spec or rbac.md). The spec lists HR Officer, Recruiter and Trainer as one row; whether they are three roles needs Beeliv confirmation. The database enforces access; this view only explains it.
      </p>
    </div>
  );
}
