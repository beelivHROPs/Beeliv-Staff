"use client";

/** Small shared pieces for the SOPs & Training screens. Section / Facts / ActivityList / Restricted are reused from the Vacancies screens. */
import { StatusMark } from "@/components/admin/standard";
import type { ContentStatus, TrackStatus } from "@/lib/admin/sops-training/types";
import { STATUS_LABEL, STATUS_TONE, TRACK_LABEL, TRACK_TONE } from "./meta";

export { Facts, Restricted, Section } from "@/components/admin/vacancies/parts";

/** Activity timeline (who, what, from -> to, note, when). Same look as the Vacancies activity list; the note is not labelled "Reason". */
export function ActivityTimeline({ items }: { items: { id: string; at: string; actor: string; action: string; from: string | null; to: string | null; note?: string }[] }) {
  if (items.length === 0) return <p className="text-[14px] text-(--ap-muted)">No activity yet.</p>;
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((e) => (
        <li key={e.id} className="group relative flex gap-3 pb-5 last:pb-0">
          <span aria-hidden="true" className="absolute top-3 -bottom-1 left-[4px] w-px bg-(--ap-line) group-last:hidden" />
          <span aria-hidden="true" className="relative mt-1.5 size-[9px] shrink-0 rounded-full bg-(--ap-violet)" />
          <div className="min-w-0">
            <p className="text-[15px] leading-snug break-words">
              <b>{e.actor}</b> · {e.action}
            </p>
            {e.to ? (
              <p className="mt-1 text-[14px] text-(--ap-ink-2)">
                {e.from ?? "Not set"} {"->"} <b>{e.to}</b>
              </p>
            ) : null}
            {e.note ? <p className="mt-1 text-[14px] break-words text-(--ap-ink-2)">{e.note}</p> : null}
            <p className="mt-0.5 text-[12px] text-(--ap-muted)">
              {new Date(e.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })},{" "}
              {new Date(e.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ContentStatusChip({ status }: { status: ContentStatus }) {
  return <StatusMark tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusMark>;
}

export function TrackChip({ status }: { status: TrackStatus }) {
  return <StatusMark tone={TRACK_TONE[status]}>{TRACK_LABEL[status]}</StatusMark>;
}

/** Small "done / assigned" progress bar used in the list and the tracking header. */
export function CompletionBar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${label}: ${done} of ${total}`}>
      <span className="h-1.5 w-full min-w-10 overflow-hidden rounded-full bg-(--ap-line-2)">
        <span className="block h-full rounded-full bg-(--ap-violet)" style={{ width: `${pct}%` }} />
      </span>
      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-(--ap-muted)">{pct}%</span>
    </div>
  );
}
