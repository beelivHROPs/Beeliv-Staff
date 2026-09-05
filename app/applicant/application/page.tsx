import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/shared/PageHeading";
import { SAMPLE_APPLICANT, SAMPLE_APPLICANT_DOCUMENTS } from "@/lib/placeholder-data";

export const metadata: Metadata = { title: "My Application" };

type StepState = "done" | "current" | "upcoming";

interface ApplicationStep {
  label: string;
  state: StepState;
  caption: string;
}

/**
 * Application Flow — docs/architecture/ui-ux-framework.md §16, screen 05.
 *
 * Deliberately low-fidelity and static: docs/architecture/recruitment-
 * workflow.md's own Workflow Overview leaves the exact step order/gating
 * unresolved (documentation may run in parallel with review, not strictly
 * after it). This screen shows the intended step structure without
 * implementing a stateful wizard or any recruitment-decision logic.
 * "Assessment" is listed for structural completeness only — no assessment
 * functionality is implemented (out of scope for this slice).
 *
 * Step done/current/upcoming states below are DERIVED from existing
 * placeholder data (SAMPLE_APPLICANT_DOCUMENTS' "personal-information"
 * entry, SAMPLE_APPLICANT's document counts) rather than invented — there is
 * no confirmed "current step" field anywhere in the docs, so Assessment and
 * Review & Submission always render as upcoming (no data confirms either
 * has started).
 */
export default function ApplicationFlowPage() {
  const { position, isShortlisted, documentsComplete, documentsTotal } = SAMPLE_APPLICANT;
  const personalInfoSubmitted =
    SAMPLE_APPLICANT_DOCUMENTS.find((doc) => doc.id === "personal-information")?.status ===
    "submitted";
  const documentationComplete = documentsComplete >= documentsTotal;

  const steps: ApplicationStep[] = [
    {
      label: "Personal Information",
      state: personalInfoSubmitted ? "done" : "upcoming",
      caption: personalInfoSubmitted ? "Submitted" : "Not yet submitted",
    },
    {
      label: "Required Documentation",
      state: documentationComplete ? "done" : documentsComplete > 0 ? "current" : "upcoming",
      caption: `${documentsComplete} of ${documentsTotal} documents complete`,
    },
    {
      label: "Assessment (if applicable)",
      state: "upcoming",
      caption: "Not yet available",
    },
    {
      label: "Review & Submission",
      state: "upcoming",
      caption: "Pending",
    },
  ];

  return (
    <div>
      <PageHeading
        title="My Application"
        description={`${position} — structural overview of the application steps.`}
      />

      <ApplicationStepper steps={steps} />

      <div className="mt-4">
        <Card>
          <CardContent>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Required Documentation
            </h2>
            {isShortlisted ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Complete your onboarding documentation to move your application forward.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {documentsComplete} of {documentsTotal} documents complete.
                </p>
                <Link
                  href="/applicant/documentation"
                  className={buttonVariants({ className: "mt-3" })}
                >
                  Go to Documentation →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This opens once you&apos;ve been shortlisted and completed any required
                  interview/assessment — there&apos;s nothing to fill in yet.
                </p>
                <Button
                  type="button"
                  disabled
                  title="Opens once you've been shortlisted"
                  className="mt-3"
                >
                  Go to Documentation →
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Static (non-animated) rendering of the step-circle/connector visual
// language ApplicationJourney.tsx established. Kept local/static rather than
// reusing that component directly: ApplicationJourney is tied to the
// dashboard's overall-status pipeline (its own heading, "Stages proposed"
// badge, and note prop), whereas this is a different, steps-within-an-
// application list — same visual pattern, different content and no
// confirmed "current step" to animate toward.
//
// Two layouts, same responsive split already established elsewhere in this
// app (components/shared/HowItWorks.tsx): a horizontal 4-column row was the
// ONLY layout before this fix, with no mobile variant at all — four labels
// like "Required Documentation" and "Review & Submission" squeezed into
// ~90px-wide columns on a phone screen, which is exactly the overflowing/
// wrapped "crooked" layout being fixed here. Mobile now gets a vertical
// stacked list (circle + label/caption to its right, connector line
// vertical) instead of trying to force a horizontal layout into a narrow
// viewport.
function ApplicationStepper({ steps }: { steps: ApplicationStep[] }) {
  return (
    <Card>
      <CardContent>
        {/* Mobile (<sm): vertical list */}
        <div className="flex flex-col sm:hidden">
          {steps.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    step.state === "done"
                      ? "border-success bg-success text-white"
                      : step.state === "current"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {step.state === "done" ? "✓" : i + 1}
                </div>
                {i < steps.length - 1 ? (
                  <div className="my-1 w-0.5 flex-1 overflow-hidden rounded bg-border">
                    <div
                      className={`w-full ${step.state === "done" ? "h-full bg-success" : "h-0"}`}
                    />
                  </div>
                ) : null}
              </div>
              <div className={`min-w-0 flex-1 ${i < steps.length - 1 ? "pb-4" : ""}`}>
                <p
                  className={`text-sm font-semibold ${
                    step.state === "current"
                      ? "text-primary"
                      : step.state === "done"
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.caption}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop (sm and up): horizontal row — unchanged from before this fix */}
        <div className="hidden sm:flex sm:items-start">
          {steps.map((step, i) => (
            <div key={step.label} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    step.state === "done"
                      ? "border-success bg-success text-white"
                      : step.state === "current"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {step.state === "done" ? "✓" : i + 1}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    step.state === "current"
                      ? "text-primary"
                      : step.state === "done"
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-[10px] text-muted-foreground">{step.caption}</div>
              </div>
              {i < steps.length - 1 ? (
                <div className="relative top-3.5 mx-1 h-0.5 flex-1 overflow-hidden rounded bg-border">
                  <div
                    className={`h-full ${step.state === "done" ? "w-full bg-success" : "w-0"}`}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
