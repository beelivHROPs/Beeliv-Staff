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
        title="Coming soon"
        description="This part of Beeliv is being connected. Real records will show here as soon as it is ready."
      />
    </div>
  );
}
