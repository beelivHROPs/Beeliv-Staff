import type { ReactNode } from "react";

export type TooltipRow = { label: string; value: ReactNode; color?: string };

/**
 * Tooltip on the shared Beeliv surface (card surface, hairline border, soft
 * shadow). Purely presentational: the chart decides where it sits and what it
 * says; nothing here computes data. `pointer-events-none` so it never steals
 * the hover from the plot beneath.
 */
export function ChartTooltip({ title, rows, footer }: { title: string; rows: TooltipRow[]; footer?: TooltipRow }) {
  return (
    <div className="pointer-events-none w-[190px] rounded-xl border border-(--ap-line) bg-(--ap-surface) px-3 py-2.5 text-(--ap-ink) shadow-(--ap-shadow)">
      <b className="block text-[13px] leading-tight">{title}</b>
      <dl className="mt-1.5 flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 text-[13px]">
            <dt className="flex items-center gap-1.5 text-(--ap-muted)">
              {r.color ? <span aria-hidden="true" className="size-2 rounded-full" style={{ background: r.color }} /> : null}
              {r.label}
            </dt>
            <dd className="m-0 font-bold tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
      {footer ? (
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-(--ap-line-2) pt-1.5 text-[13px]">
          <span className="text-(--ap-muted)">{footer.label}</span>
          <b className="tabular-nums">{footer.value}</b>
        </div>
      ) : null}
    </div>
  );
}
