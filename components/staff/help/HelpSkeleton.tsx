import { Sk } from "../kit";

/** Also used by the route-level loading.tsx (server-safe: no hooks). Matches the Help layout. */
export function HelpSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1120px] pt-1" aria-busy="true" aria-label="Loading help and support">
      <h1 className="sr-only">Help &amp; support</h1>
      <Sk className="h-9 w-56" />
      <Sk className="mt-3 mb-5 h-4 w-72 max-w-full" />
      <div className="grid grid-cols-1 gap-5 min-[1000px]:grid-cols-[minmax(0,1fr)_360px]">
        <Sk className="h-[420px]" />
        <div className="flex flex-col gap-5">
          <Sk className="h-[190px]" />
          <Sk className="h-[190px]" />
        </div>
      </div>
    </div>
  );
}
