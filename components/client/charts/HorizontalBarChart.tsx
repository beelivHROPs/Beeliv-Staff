import Link from "next/link";
import { ChevronRight } from "@/components/applicant/icons";
import { PLUM, TRACK } from "./colors";

export type BarRow = { key: string; label: string; value: number; href?: string; color?: string };

/**
 * Horizontal comparison bars (workforce by department / role). CSS only. Each
 * row is a real link when it has an `href` (clicking "Kitchen 13" filters My
 * Workforce), and the whole chart is a list so assistive tech reads "Kitchen,
 * 13" per row. One colour unless a row brings its own - no rainbow.
 */
export function HorizontalBarChart({ rows, ariaLabel, showShare = false }: { rows: BarRow[]; ariaLabel: string; showShare?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <ul aria-label={ariaLabel} className="m-0 flex list-none flex-col gap-1 p-0">
      {rows.map((r) => {
        const body = (
          <>
            <span className="w-[92px] shrink-0 truncate text-[14px] text-(--ap-ink-2) max-[380px]:w-[78px]">{r.label}</span>
            <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden="true">
              <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? PLUM, minWidth: r.value > 0 ? 6 : 0 }} />
            </span>
            <b className="w-7 shrink-0 text-right text-[14px] text-(--ap-ink) tabular-nums">{r.value}</b>
            {showShare ? <span className="w-10 shrink-0 text-right text-[13px] text-(--ap-muted) tabular-nums">{total ? Math.round((r.value / total) * 100) : 0}%</span> : null}
            {r.href ? <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" /> : null}
          </>
        );
        const cls = "flex min-h-[38px] items-center gap-3 rounded-lg px-2";
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className={`${cls} hover:bg-(--ap-line-2)`}>
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
