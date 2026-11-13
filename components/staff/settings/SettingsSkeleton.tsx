import { Sk } from "../kit";

/** Also used by the route-level loading.tsx (server-safe: no hooks). Matches the Settings layout. */
export function SettingsSkeleton() {
  return (
    <div className="w-full pt-1" aria-busy="true" aria-label="Loading your settings">
      <h1 className="sr-only">Settings</h1>
      <Sk className="h-9 w-40" />
      <Sk className="mt-3 mb-5 h-4 w-72 max-w-full" />
      <div className="flex flex-col gap-5">
        <Sk className="h-[420px]" />
        <Sk className="h-[110px]" />
        <Sk className="h-[170px]" />
      </div>
    </div>
  );
}
