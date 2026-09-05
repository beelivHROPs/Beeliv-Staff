import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/applicant/notifications/page.tsx: PageHeading + a Card
 *  wrapping ActivityTimeline's own shape (left border, dot, date/title/
 *  description per row) — same 3-item count as SAMPLE_APPLICATION_ACTIVITY. */
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />

      <div className="mt-4">
        <Card>
          <CardContent>
            <ul className="m-0 list-none p-0">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="relative border-l-2 border-border py-0 pr-0 pb-4 pl-5 last:border-transparent last:pb-0"
                >
                  <span className="absolute top-1 -left-[7px] size-2.5 rounded-full border-2 border-card bg-muted" />
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="mt-1 h-3.5 w-48 max-w-full" />
                  <Skeleton className="mt-1 h-3 w-64 max-w-full" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
