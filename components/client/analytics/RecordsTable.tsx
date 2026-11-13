"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronRight } from "@/components/applicant/icons";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "right";
  /** The row's headline on phone/tablet cards (exactly one column should be primary). */
  primary?: boolean;
};

/**
 * The records under a report visual. A real <table> from 1101px; below that a
 * card list (headline + a small label/value grid) so phones and tablets never
 * scroll sideways. Long lists page with "Show more" instead of rendering
 * hundreds of rows. Rows can link to the underlying record (drill-through).
 */
export function RecordsTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  caption,
  pageSize = 10,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
  caption: string;
  pageSize?: number;
}) {
  const [shown, setShown] = useState(pageSize);
  const visible = rows.slice(0, shown);
  const remaining = rows.length - visible.length;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <div>
      <table className="hidden w-full border-collapse text-left text-[14px] min-[1101px]:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`border-b border-(--ap-line) px-3 py-2.5 text-[12px] font-bold tracking-wide whitespace-nowrap text-(--ap-muted) uppercase ${c.align === "right" ? "text-right" : ""}`}>
                {c.header}
              </th>
            ))}
            {rowHref ? <th scope="col" className="w-8 border-b border-(--ap-line)"><span className="sr-only">Open</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const href = rowHref?.(r);
            return (
              <tr key={rowKey(r)} className="border-b border-(--ap-line-2) last:border-b-0 hover:bg-(--ap-tint-soft)">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2.5 align-middle text-(--ap-ink-2) ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                    {c.cell(r)}
                  </td>
                ))}
                {rowHref ? (
                  <td className="pr-2">
                    {href ? (
                      <Link href={href} aria-label={`Open ${caption} record`} className="ap-hit inline-flex text-(--ap-faint) hover:text-(--ap-violet)">
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul aria-label={caption} className="m-0 flex list-none flex-col p-0 min-[1101px]:hidden">
        {visible.map((r) => {
          const href = rowHref?.(r);
          const body = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-[15px] font-bold text-(--ap-ink)">{primary.cell(r)}</span>
                {href ? <ChevronRight className="mt-0.5 size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" /> : null}
              </span>
              <dl className="m-0 mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 min-[768px]:grid-cols-3">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[12px] text-(--ap-muted)">{c.header}</dt>
                    <dd className="m-0 min-w-0 text-[14px] text-(--ap-ink-2)">{c.cell(r)}</dd>
                  </div>
                ))}
              </dl>
            </>
          );
          const cls = "block border-t border-(--ap-line-2) py-3 first:border-t-0";
          return (
            <li key={rowKey(r)}>
              {href ? (
                <Link href={href} className={`${cls} hover:bg-(--ap-tint-soft)`}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {remaining > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--ap-line-2) pt-3">
          <span className="text-[13px] text-(--ap-muted)">
            Showing {visible.length} of {rows.length}
          </span>
          <button type="button" onClick={() => setShown((n) => n + pageSize * 2)} className="ap-btn ap-btn-s ap-btn-sm max-[480px]:w-full">
            Show more
          </button>
        </div>
      ) : (
        <p className="mt-3 border-t border-(--ap-line-2) pt-3 text-[13px] text-(--ap-muted)">
          {rows.length} {rows.length === 1 ? "record" : "records"}
        </p>
      )}
    </div>
  );
}
