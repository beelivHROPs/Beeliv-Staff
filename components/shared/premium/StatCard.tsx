import type { ReactNode } from "react";
import { LIFT, SURFACE } from "./tones";

/**
 * One big number, one small label, optional ring on the right. Answers ONE question
 * ("how many documents to upload?"). Pass `href`-style wrappers outside if clickable.
 */
export function StatCard({ value, label, ring, className = "" }: { value: ReactNode; label: string; ring?: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-20 items-center justify-between gap-3 rounded-[22px] p-4 ${SURFACE} ${LIFT} ${className}`}>
      <div className="min-w-0">
        <p className="text-[32px] leading-none font-bold text-(--ap-ink,#11111b) tabular-nums">{value}</p>
        <p className="mt-1.5 text-[14px] leading-snug text-(--ap-muted,#686672)">{label}</p>
      </div>
      {ring ? <div className="shrink-0">{ring}</div> : null}
    </div>
  );
}
