import Link from "next/link";

export type LegendItem = {
  key: string;
  label: string;
  /** Count shown at the right. */
  value?: number | string;
  /** Secondary figure, e.g. "87.5%". */
  percent?: string;
  color: string;
  /** Drill-through: the legend row becomes a link to the filtered records. */
  href?: string;
};

/**
 * Legend as a REAL list (screen readers announce "list, 4 items"). Rows with
 * an `href` are links - legends are the accessible way to drill into records
 * (chart segments are a mouse convenience only). `onHover` lets a chart
 * highlight the matching segment.
 */
export function ChartLegend({
  items,
  layout = "list",
  ariaLabel,
  activeKey,
  onHover,
  className = "",
}: {
  items: LegendItem[];
  layout?: "list" | "inline";
  ariaLabel: string;
  activeKey?: string | null;
  onHover?: (key: string | null) => void;
  className?: string;
}) {
  return (
    <ul aria-label={ariaLabel} className={`m-0 list-none p-0 ${layout === "inline" ? "flex flex-wrap gap-x-4 gap-y-1.5" : "flex flex-col gap-0.5"} ${className}`}>
      {items.map((it) => {
        const dot = <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: it.color }} />;
        const dim = activeKey && activeKey !== it.key ? "opacity-55" : "";
        const inner =
          layout === "inline" ? (
            <>
              {dot}
              <span className="text-[13px] text-(--ap-ink-2)">{it.label}</span>
            </>
          ) : (
            <>
              {dot}
              <span className="min-w-0 flex-1 truncate text-[14px] text-(--ap-ink-2)">{it.label}</span>
              {it.value !== undefined ? <b className="w-8 shrink-0 text-right text-[14px] text-(--ap-ink) tabular-nums">{it.value}</b> : null}
              {it.percent ? <span className="w-12 shrink-0 text-right text-[13px] text-(--ap-muted) tabular-nums">{it.percent}</span> : null}
            </>
          );
        const cls = `flex min-h-[34px] items-center gap-2.5 rounded-lg px-2 transition-opacity ${dim} ${it.href ? "hover:bg-(--ap-line-2) focus-visible:bg-(--ap-line-2)" : ""}`;
        return (
          <li key={it.key} onMouseEnter={() => onHover?.(it.key)} onMouseLeave={() => onHover?.(null)}>
            {it.href ? (
              <Link href={it.href} className={cls} onFocus={() => onHover?.(it.key)} onBlur={() => onHover?.(null)}>
                {inner}
              </Link>
            ) : (
              <span className={cls}>{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
