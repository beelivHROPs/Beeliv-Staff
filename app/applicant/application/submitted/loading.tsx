import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/applicant/application/submitted/page.tsx: centered
 *  confirmation message + button, nothing else on this screen. */
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Skeleton className="h-6 w-72 max-w-full" />
      <Skeleton className="mt-2 h-4 w-56 max-w-full" />
      <Skeleton className="mt-6 h-10 w-40 rounded-md" />
    </div>
  );
}
