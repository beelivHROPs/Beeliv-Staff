import type { ReactNode } from "react";
import "./states.css";

/**
 * One neutral screen for "not allowed" AND "not found". `kind` exists so call
 * sites read clearly, but the copy is deliberately identical: nothing here may
 * reveal whether the thing exists, or name another organisation, outlet or
 * person (shared-states.md rule 1).
 */
export function PermissionState({
  kind,
  action,
  level = 1,
}: {
  kind: "denied" | "unavailable";
  /** Optional safe next step, e.g. a link back to the portal's home. */
  action?: ReactNode;
  level?: 1 | 2;
}) {
  void kind;
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <section className="st st-perm" aria-labelledby="st-perm-title">
      <Heading id="st-perm-title">This page isn&apos;t available</Heading>
      <p>
        It may have moved, or you may not have access. If you think this is a mistake, contact
        Beeliv.
      </p>
      {action}
    </section>
  );
}
