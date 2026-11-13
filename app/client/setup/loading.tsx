import { PageSkeleton } from "@/components/client/recruitment/states";

export default function Loading() {
  return <PageSkeleton title="Account setup" label="Loading account setup" blocks={[92, 420]} />;
}
