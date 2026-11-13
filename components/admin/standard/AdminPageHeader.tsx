/**
 * The one Admin page header: title on the left, ONE primary action on the
 * right, an optional "..." menu after it, and an optional quiet one-line
 * summary under the title. Matches the Calendar / Scheduling header (same
 * PageHeading type and spacing, 44px buttons).
 *
 * Pass the primary action as a normal `ap-btn ap-btn-p h-11` button or link.
 * Everything secondary belongs in `more` (see MoreMenu).
 */
import type { ReactNode } from "react";
import { PAGE_TITLE } from "@/components/applicant/primitives";

export function AdminPageHeader({ title, primary, more, summary }: { title: string; primary?: ReactNode; more?: ReactNode; summary?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-3 pb-4 max-[767px]:items-center max-[767px]:gap-3 max-[767px]:pb-3">
      <div className="min-w-0">
        <h1 className={`${PAGE_TITLE} ap-pagehead-title max-[767px]:text-[28px]`}>{title}</h1>
        {summary ? <div className="mt-1.5">{summary}</div> : null}
      </div>
      {primary || more ? (
        <div className="flex items-center gap-2">
          {primary}
          {more}
        </div>
      ) : null}
    </div>
  );
}
