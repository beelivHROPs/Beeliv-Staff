"use client";

import { useState, type ReactNode } from "react";
import {
  enterLive,
  liveSeedState,
  LiveApplicantContext,
  type LiveApplicantSeed,
} from "@/lib/applicant/service";

/**
 * Real applicants (live deployments): the Applicant store starts empty with the signed-in person's own details and
 * reads/writes applications through the server. Rendered by app/applicant/layout.tsx only when not in preview, so no
 * sample person, application, interview or notification can ever appear for a real user.
 */
export function ApplicantLiveBoot({
  seed,
  children,
}: {
  seed: LiveApplicantSeed;
  children: ReactNode;
}) {
  const [snapshot] = useState(() => {
    const s = liveSeedState(seed);
    enterLive(seed, s); // client: before any child reads the store; no-op on the server
    return s;
  });
  return (
    <LiveApplicantContext.Provider value={snapshot}>
      {children}
    </LiveApplicantContext.Provider>
  );
}
