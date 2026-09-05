"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface JourneyStage {
  label: string;
  date: string;
  state: "done" | "current" | "upcoming";
}

/**
 * Application-journey stepper. Stage labels/structure: an applicant-facing
 * simplification of the CONFIRMED 8-stage workflow (docs/BEELIV-SOURCE-OF-
 * TRUTH.md §3) — Application/Review/Interview & Assessment/Documentation/
 * Final Decision — collapsing the four internal-only stages (Verification,
 * Selection/Approval, Staff Onboarding, Assignment) into "Final Decision"
 * since those happen after an applicant is already deep in an authenticated
 * flow and aren't meaningful to surface here. The "Stages proposed" badge
 * below reflects that this simplification/labeling choice itself is a
 * Professional Recommendation, not that the underlying workflow is unconfirmed.
 *
 * Mobile fix: same bug class already fixed on the other steppers this
 * session (app/applicant/application/page.tsx's ApplicationStepper,
 * components/applicant/documentation/StepIndicator.tsx) — a horizontal-only
 * `flex-1` row with no `sm:` variant wraps/crushes on a phone, worse now
 * that this went from 3 stages to 5. Mobile gets a vertical stacked list
 * (matching ApplicationStepper's plain CSS-class fill, not the JS replay-
 * animation below — that stays desktop-only, unchanged); desktop is the
 * original horizontal row, untouched, just wrapped in `hidden sm:flex`.
 */
export function ApplicationJourney({
  stages,
  note,
}: {
  stages: JourneyStage[];
  note?: string;
}) {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      const filled = stages[i]?.state === "done";
      el.style.transition = "none";
      el.style.width = "0%";
      el.getBoundingClientRect();
      el.style.transition = "width 1.1s cubic-bezier(0.4,0,0.2,1) 0.2s";
      el.style.width = filled ? "100%" : "0%";
    });
  }, [stages]);

  return (
    <Card>
      <CardContent>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Application Journey
        </h2>
        <Badge variant="warning" className="text-[10px] tracking-wide uppercase">
          Stages proposed
        </Badge>
      </div>

      {/* Mobile (<sm): vertical list, plain state-driven fill (no replay
          animation — matches ApplicationStepper's convention). */}
      <div className="flex flex-col sm:hidden">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  stage.state === "done"
                    ? "border-success bg-success text-white"
                    : stage.state === "current"
                      ? "animate-journey-breathe border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                {stage.state === "done" ? "✓" : i + 1}
              </div>
              {i < stages.length - 1 ? (
                <div className="my-1 w-0.5 flex-1 overflow-hidden rounded bg-border">
                  <div className={`w-full ${stage.state === "done" ? "h-full bg-success" : "h-0"}`} />
                </div>
              ) : null}
            </div>
            <div className={`min-w-0 flex-1 ${i < stages.length - 1 ? "pb-4" : ""}`}>
              <p
                className={`text-sm font-semibold ${
                  stage.state === "current"
                    ? "text-primary"
                    : stage.state === "done"
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </p>
              <p className="text-xs text-muted-foreground">{stage.date}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop (sm and up): horizontal row — unchanged from before this
          fix, including the JS replay-fill animation. */}
      <div className="hidden sm:flex sm:items-start">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  stage.state === "done"
                    ? "border-success bg-success text-white"
                    : stage.state === "current"
                      ? "animate-journey-breathe border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                {stage.state === "done" ? "✓" : i + 1}
              </div>
              <div
                className={`text-xs font-semibold ${
                  stage.state === "current"
                    ? "text-primary"
                    : stage.state === "done"
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </div>
              <div className="text-[10px] text-muted-foreground">{stage.date}</div>
            </div>
            {i < stages.length - 1 ? (
              <div className="relative top-3.5 mx-1 h-0.5 flex-1 overflow-hidden rounded bg-border">
                <div
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className="h-full w-0 bg-success motion-reduce:!w-full motion-reduce:!transition-none"
                  style={{ width: stage.state === "done" ? "100%" : "0%" }}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {note ? (
        <p className="mt-4 rounded-md bg-accent px-3 py-2.5 text-xs text-accent-foreground">
          {note}
        </p>
      ) : null}
      </CardContent>
    </Card>
  );
}
