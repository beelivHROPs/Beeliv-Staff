import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/applicant/application/page.tsx: page title, 4-step journey
 *  card (vertical on mobile, horizontal on desktop — matches
 *  ApplicationStepper's own responsive split), then the Required
 *  Documentation card. */
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />

      <Card className="mt-4">
        <CardContent>
          <div className="flex flex-col gap-4 sm:hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="mt-1.5 h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden items-start sm:flex">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5 px-2">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-3 w-full max-w-sm" />
          <Skeleton className="mt-2 h-3 w-32" />
          <Skeleton className="mt-3 h-9 w-40 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
