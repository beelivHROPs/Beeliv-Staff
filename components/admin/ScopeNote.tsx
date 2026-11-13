"use client";

/**
 * Scope presentation for the internal (HR) screens:
 *
 *   <ScopeNote />            one quiet line under the page title, e.g.
 *                            "Showing your 2 assigned clients: Demo Hotel Abuja, Demo Lounge Lagos"
 *                            or "Showing all clients" (HR Manager / Operations)
 *   <ScopeGate>...</ScopeGate>  renders its children, or - for an HR officer with NO
 *                            assigned client - the empty state "No clients are assigned
 *                            to you yet. Ask Operations to assign you."
 *
 * Presentation only. What a user may really see is decided server-side (grant +
 * RLS); the prototype derives the scope from the dev identity (lib/admin/scope.ts).
 */
import type { ReactNode } from "react";
import { Users } from "@/components/applicant/icons";
import { Note } from "@/components/applicant/apply/parts";
import { EmptyState } from "@/components/applicant/primitives";
import { NO_CLIENTS_TEXT, useAdminScope } from "@/lib/admin/scope";

/** Sits right under <PageHeading> (pulls up into its bottom padding). Nothing is shown when no client is assigned (the empty state says it). */
export function ScopeNote({ className = "-mt-3 mb-4 max-[767px]:mb-3" }: { className?: string }) {
  // Retired (project lead, 2026-10-27): "Showing all clients" / "Showing your 2 assigned clients" is no longer shown on any page.
  // The scope still applies to the data; the empty state below says so when an HR officer has no client assigned.
  void className;
  return null;
}

export function ScopeEmpty() {
  return (
    <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
      <EmptyState icon={Users} title="No clients assigned yet" description={NO_CLIENTS_TEXT} />
    </div>
  );
}

/** The page body, or the empty-scope state when the HR officer has no assigned client. */
export function ScopeGate({ children }: { children: ReactNode }) {
  const scope = useAdminScope();
  return scope.none ? <ScopeEmpty /> : <>{children}</>;
}
