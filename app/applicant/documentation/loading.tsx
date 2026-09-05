import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/shared/Skeleton";

/** Mirrors app/applicant/documentation/page.tsx via DocumentsScreen and, once
 *  shortlisted, DocumentationWizard: page title, the Documentation Form /
 *  Document Status tabs, the 6-step StepIndicator (its own mobile
 *  label+progress-bar vs. desktop circle-row split), and Step 1's actual
 *  field shape (StepPersonalInfo — a dense 2-column grid, not a sparse 4-
 *  field guess) plus the wizard's Back/Next footer. Represents the
 *  shortlisted happy path, same convention as the dashboard skeletons. */
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />

      <div className="mt-5 mb-5 flex gap-1.5 border-b border-border">
        <div className="-mb-px border-b-2 border-primary px-1 pb-2.5">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="-mb-px border-b-2 border-transparent px-1 pb-2.5">
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <Card>
        <CardContent>
          {/* Mobile: current-step label + "Step X of Y", then a 6-segment
              progress bar — matches StepIndicator's sm:hidden branch. */}
          <div className="sm:hidden">
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16 shrink-0" />
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
              ))}
            </div>
          </div>

          {/* Desktop: 6 numbered circles + labels + connectors — matches
              StepIndicator's hidden sm:flex branch. */}
          <div className="hidden items-start sm:flex">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-1 items-start last:flex-none">
                <div className="flex flex-1 flex-col items-center gap-1.5">
                  <Skeleton className="size-7 rounded-full" />
                  <Skeleton className="h-3 w-14" />
                </div>
                {i < 5 ? (
                  <div className="relative top-3.5 mx-1 h-0.5 flex-1 rounded bg-border" />
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1 (Personal Information) field shape — the step actually
          showing at rest, before any Next click. */}
      <div className="mt-4">
        <Card>
          <CardContent>
            <Skeleton className="mb-1 h-4 w-44" />
            <Skeleton className="mb-4 h-3 w-56 max-w-full" />

            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-1.5 h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-1.5 h-9 w-full rounded-lg" />
            </div>

            <div className="mt-4">
              <Skeleton className="h-3 w-40" />
              <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-48 max-w-full" />
                  <Skeleton className="mt-1.5 h-2.5 w-24" />
                </div>
                <Button type="button" size="sm" variant="outline" disabled className="shrink-0">
                  Upload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button type="button" variant="outline" disabled>
          Back
        </Button>
        <Button type="button" disabled>
          Next
        </Button>
      </div>
    </div>
  );
}
