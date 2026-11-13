import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "@/components/applicant/icons";
import { PLUM, TRACK } from "./colors";

/**
 * Assigned / required progress bar for one shift. Restrained: plum while
 * positions are open, semantic green once every position is filled. It states
 * facts ("2 positions open") and never labels anything "understaffed" -
 * thresholds are a Beeliv / backend rule, not the UI's.
 */
export function CoverageBar({
  label,
  detail,
  assigned,
  required,
  icon,
  href,
}: {
  label: string;
  /** e.g. "8:00 AM - 4:00 PM". */
  detail: string;
  assigned: number;
  required: number;
  icon?: ReactNode;
  href?: string;
}) {
  const open = Math.max(0, required - assigned);
  const full = required > 0 && assigned >= required;
  const pct = required > 0 ? Math.min(100, (assigned / required) * 100) : 0;
  const body = (
    <>
      <span className="flex items-center gap-3">
        {icon ? <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">{icon}</span> : null}
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block text-[15px] text-(--ap-ink)">{label}</b>
          <span className="block text-[13px] text-(--ap-muted)">{detail}</span>
        </span>
        <b className="shrink-0 text-[17px] text-(--ap-ink) tabular-nums">
          {assigned} <span className="font-normal text-(--ap-muted)">/ {required}</span>
        </b>
        {href ? <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" /> : null}
      </span>
      <span className="flex items-center gap-3">
        <span
          className="block h-2 min-w-0 flex-1 overflow-hidden rounded-full"
          style={{ background: TRACK }}
          role="progressbar"
          aria-label={`${label}: ${assigned} of ${required} assigned`}
          aria-valuemin={0}
          aria-valuemax={required}
          aria-valuenow={assigned}
        >
          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: full ? "var(--ap-ok)" : PLUM }} />
        </span>
        <span className={`shrink-0 text-[12px] ${full ? "font-bold text-(--ap-ok)" : "text-(--ap-muted)"}`}>{full ? "Fully covered" : `${open} ${open === 1 ? "position" : "positions"} open`}</span>
      </span>
    </>
  );
  const cls = "flex flex-col gap-2.5 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-3 py-3";
  return href ? (
    <Link href={href} className={`${cls} hover:border-(--ap-tint-2)`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
