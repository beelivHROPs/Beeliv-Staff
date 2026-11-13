import { Sk } from "../kit";

/** Also used by the route-level loading.tsx (server-safe: no hooks). Matches the hero plus two-column cards. */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2" aria-busy="true" aria-label="Loading your profile">
      <h1 className="sr-only">Profile</h1>
      <Sk className="h-[170px] rounded-[26px]" />
      <div className="grid grid-cols-1 gap-5 min-[1000px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Sk className="h-[260px]" />
          <Sk className="h-[260px]" />
          <Sk className="h-[160px]" />
        </div>
        <div className="flex flex-col gap-5">
          <Sk className="h-[150px]" />
          <Sk className="h-[150px]" />
          <Sk className="h-[190px]" />
        </div>
      </div>
    </div>
  );
}
