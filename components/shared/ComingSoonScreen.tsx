import { PageHeading } from "./PageHeading";
import { EmptyState } from "./EmptyState";

/**
 * Used for screens listed in docs/architecture/ui-ux-framework.md as required
 * navigation destinations that are not among the "major" wireframes built out
 * in this implementation slice. Keeps navigation link-safe (no 404s) without
 * pretending functionality exists that hasn't been implemented.
 */
export function ComingSoonScreen({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <PageHeading title={title} description={description} />
      <EmptyState
        variant="default"
        title="Not yet implemented"
        description="This screen's structure is reserved in the navigation per the Stage 1 UI/UX framework. Its data and interactions are Stage 2+ work."
      />
    </div>
  );
}
