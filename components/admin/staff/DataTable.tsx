import type { ReactNode } from "react";

/**
 * Read-only record table that reflows by container width: a header row and
 * columns when wide, labelled stacked rows when narrow. No horizontal scroll.
 * `cols` is a Tailwind grid-template class (arbitrary value) used from 560px.
 */
export function DataTable({ label, heads, cols, rows }: { label: string; heads: string[]; cols: string; rows: { key: string; cells: ReactNode[] }[] }) {
  return (
    <div role="table" aria-label={label} className="@container">
      <div role="row" className={`hidden gap-x-4 border-b border-(--ap-line) px-1 pb-2 text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase @min-[560px]:grid ${cols}`}>
        {heads.map((h) => (
          <span key={h} role="columnheader">
            {h}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.key} role="row" className={`ad-clickrow grid grid-cols-1 gap-x-4 gap-y-1.5 border-b border-(--ap-line-2) px-1 py-3 text-[14px] last:border-b-0 @min-[560px]:items-center ${cols}`}>
          {r.cells.map((c, i) => (
            <div key={heads[i]} role="cell" className="min-w-0 break-words">
              <span className="mr-2 text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase @min-[560px]:hidden">{heads[i]}</span>
              {c}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
