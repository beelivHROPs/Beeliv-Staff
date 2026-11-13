/**
 * One quiet line of counts separated by hairlines. Replaces rows of count
 * tiles and repeated status chips. An item with `onClick` is a button (it
 * filters the list); `active` marks the one currently applied. `extra` sits
 * at the end of the line (typically an InfoHint).
 */
import Link from "next/link";
import type { ReactNode } from "react";

export interface SummaryItem {
  key: string;
  label: string;
  value: number | string;
  onClick?: () => void;
  /** Makes the item a link instead (use for items that open another page). */
  href?: string;
  active?: boolean;
  /** Draw attention (late, absent, needs you). Colour is used for this only. */
  alert?: boolean;
}

export function SummaryLine({ items, label, lead, extra, className = "", pills = false }: { items: SummaryItem[]; label: string; /** Quiet text before the counts, e.g. "Today, Saturday 17 October". */ lead?: ReactNode; extra?: ReactNode; className?: string; /** Phones: show the clickable counts as one row of status pills (the mid-ground list look). */ pills?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-0 gap-y-1 text-[13px] text-(--ap-muted) ${pills ? "max-[767px]:hidden " : ""}${className}`}>
      {lead ? <span className="mr-3 font-semibold text-(--ap-ink-2)">{lead}</span> : null}
      <ul aria-label={label} className={`ap-scrollbar-none m-0 flex min-w-0 list-none flex-wrap items-center gap-y-1 p-0 max-[767px]:w-full max-[767px]:flex-nowrap max-[767px]:overflow-x-auto ${pills ? "max-[767px]:gap-2 max-[767px]:py-1" : ""}`}>
        {items.map((it, i) => {
          const body = (
            <>
              <b className={`font-bold tabular-nums ${it.alert && Number(it.value) > 0 ? "text-(--ap-warn)" : "text-(--ap-ink)"}`}>{it.value}</b> {it.label}
            </>
          );
          return (
            <li key={it.key} className={`flex shrink-0 items-center whitespace-nowrap ${i > 0 ? `ml-3 border-l border-(--ap-line) pl-3 ${pills ? "max-[767px]:ml-0 max-[767px]:border-0 max-[767px]:pl-0" : ""}` : ""}`}>
              {it.href ? (
                <Link href={it.href} className="ap-hit -mx-1 rounded-md px-1 py-0.5 text-(--ap-muted) transition-colors hover:text-(--ap-ink) hover:underline hover:decoration-(--ap-line) hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
                  {body}
                </Link>
              ) : it.onClick ? (
                <button
                  type="button"
                  onClick={it.onClick}
                  aria-pressed={it.active ?? false}
                  className={`ap-hit -mx-1 rounded-md px-1 py-0.5 transition-colors hover:text-(--ap-ink) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${pills ? `max-[767px]:mx-0 max-[767px]:inline-flex max-[767px]:h-10 max-[767px]:gap-1.5 max-[767px]:items-center max-[767px]:rounded-full max-[767px]:px-4 max-[767px]:text-[14px] max-[767px]:font-bold max-[767px]:no-underline! ${it.active ? "ad-grad max-[767px]:shadow-[0_8px_18px_rgba(139,34,82,.28)]" : "max-[767px]:bg-(--ap-surface) max-[767px]:shadow-[0_4px_12px_rgba(60,30,80,.06)]"} ` : ""}${it.active ? "font-semibold text-(--ap-ink) underline decoration-(--ap-violet) decoration-2 underline-offset-4" : "hover:underline hover:decoration-(--ap-line) hover:underline-offset-4"}`}
                >
                  {body}
                </button>
              ) : (
                <span>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
      {extra ? <span className="ml-1.5 inline-flex items-center">{extra}</span> : null}
    </div>
  );
}
