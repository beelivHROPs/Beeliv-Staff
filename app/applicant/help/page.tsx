import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Help & Support" };

/**
 * Help & Support — standard app scaffolding, not a documented RBAC feature.
 * Kept as a simple placeholder rather than designed in depth, consistent
 * with how it was treated in the reviewed design artifact.
 */
export default function ApplicantHelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        variant="default"
        title="Help & Support"
        description="Contact and support options aren't part of the documented Stage 1 scope yet — this page is reserved for navigation completeness."
      />
    </div>
  );
}
