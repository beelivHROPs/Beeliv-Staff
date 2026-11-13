"use client";

/** Shared state panels for the Workforce screens: loading skeleton, error, unauthorized, empty. */
import type { ReactNode } from "react";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import type { LucideIcon } from "@/components/applicant/icons";
import { RestrictedPanel } from "@/components/admin/interviews/ui";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import type { LoadStatus } from "@/lib/admin/types";

export function ListSkeleton({ title, rows = 5 }: { title: string; rows?: number }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`}>
      <PageHeading title={title} />
      <div className="mb-3 grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-5 min-[768px]:gap-3.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${sk} h-[84px]`} />
        ))}
      </div>
      <div className={`${sk} mb-3 h-12`} />
      <div className={`${sk} mb-4 h-11 w-96 max-w-full`} />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`${sk} h-[72px]`} />
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton({ label }: { label: string }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div className={`${sk} mb-4 h-20`} />
      <div className="grid gap-4 min-[1100px]:grid-cols-[1.5fr_1fr]">
        <div className={`${sk} h-[360px]`} />
        <div className={`${sk} h-[360px]`} />
      </div>
    </div>
  );
}

/** Error or unauthorized for a list screen. Returns null when the status is fine. */
export function FailurePanel({ status, title, what, retry }: { status: LoadStatus; title: string; what: string; retry: () => void }) {
  if (status === "restricted") return <RestrictedPanel title={title} what={what} />;
  if (status === "error") {
    return (
      <>
        <PageHeading title={title} />
        <ErrorPanel title={`We could not load ${what.toLowerCase()}`} retry={retry} />
      </>
    );
  }
  return null;
}

export function EmptyCard({ icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </div>
  );
}
