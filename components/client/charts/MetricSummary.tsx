import Link from "next/link";
import type { ReactNode } from "react";

export type MetricItem = {
  key: string;
  label: string;
  value: ReactNode;
  /** Small muted line under the label, e.g. "of 48 scheduled". */
  sub?: string;
  /** Drill-through: the tile becomes a link to the underlying records. */
  href?: string;
  /** Semantic colour for the figure; plain ink by default. */
  tone?: "ok" | "warn" | "bad" | "info" | "plum";
};

const TONE: Record<NonNullable<MetricItem["tone"]>, string> = {
  ok: "text-(--ap-ok)",
  warn: "text-(--ap-warn)",
  bad: "text-(--ap-rose)",
  info: "text-(--ap-info)",
  plum: "text-(--ap-violet)",
};

/**
 * A quiet row of headline figures above a report's visual (Reports / analytics
 * centre). Two columns on phones, up to four across from tablet. Facts only:
 * no trend arrows, no growth percentages, no targets.
 */
export function MetricSummary({ items, ariaLabel }: { items: MetricItem[]; ariaLabel: string }) {
  const cols = items.length >= 4 ? "min-[768px]:grid-cols-4" : items.length === 3 ? "min-[768px]:grid-cols-3" : "min-[768px]:grid-cols-2";
  return (
    <section aria-label={ariaLabel} className={`grid grid-cols-2 gap-2.5 min-[768px]:gap-3.5 ${cols}`}>
      {items.map((m) => {
        const body = (
          <>
            <b className={`block text-[26px] leading-none font-bold tracking-tight tabular-nums ${m.tone ? TONE[m.tone] : "text-(--ap-ink)"}`}>{m.value}</b>
            <span className="mt-1.5 block text-[14px] leading-tight font-semibold text-(--ap-ink-2)">{m.label}</span>
            {m.sub ? <span className="mt-0.5 block text-[12px] leading-tight text-(--ap-muted)">{m.sub}</span> : null}
          </>
        );
        const cls = "ap-card min-w-0 rounded-2xl p-3.5 min-[768px]:p-4";
        return m.href ? (
          <Link key={m.key} href={m.href} className={`${cls} ap-card-hover`}>
            {body}
          </Link>
        ) : (
          <div key={m.key} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
