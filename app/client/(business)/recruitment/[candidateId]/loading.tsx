import { PageSkeleton } from "@/components/client/recruitment/states";

export default function Loading() {
  return <PageSkeleton title="Candidate" label="Loading candidate" blocks={[150, 200, 260]} />;
}
