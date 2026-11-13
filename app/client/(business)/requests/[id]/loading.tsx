import { PageSkeleton } from "@/components/client/recruitment/states";

export default function Loading() {
  return <PageSkeleton title="Workforce request" label="Loading request" blocks={[130, 220, 160]} />;
}
