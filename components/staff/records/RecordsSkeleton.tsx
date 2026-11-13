import { Sk } from "../kit";

/** Also used by the route-level loading.tsx (server-safe: no hooks). Matches the one-container list. */
export function RecordsSkeleton() {
  return (
    <div className="w-full pt-1" aria-busy="true" aria-label="Loading your records">
      <h1 className="sr-only">Warnings &amp; Records</h1>
      <Sk className="h-9 w-64 max-w-full" />
      <Sk className="mt-3 mb-5 h-4 w-80 max-w-full" />
      <Sk className="h-[240px]" />
    </div>
  );
}
