"use client";

import { ErrorPanel } from "../ErrorPanel";

/** Shimmer block used by every Staff loading skeleton (matches Home). */
export const SK = "ap-shimmer rounded-2xl";

/** Shared "couldn't load" card with Retry, used by Leave, Documents and SOPs & Training. */
export function PageError({ what, retry }: { what: string; retry: () => void }) {
  return (
    <ErrorPanel title={`We couldn't load ${what}`} retry={retry} />
  );
}

/** Page-heading skeleton (h1 stays in the DOM for screen readers). */
export function HeadingSkeleton({ title }: { title: string }) {
  return (
    <div className="pt-3 pb-5">
      <h1 className="sr-only">{title}</h1>
      <div className={`${SK} h-9 w-40 min-[768px]:h-11 min-[768px]:w-56`} />
      <div className={`${SK} mt-3 h-4 w-64 max-w-full`} />
    </div>
  );
}
