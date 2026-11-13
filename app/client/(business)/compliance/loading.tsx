import { PageSkeleton } from "@/components/client/recruitment/states";

export default function Loading() {
  return <PageSkeleton title="Documents & Compliance" label="Loading compliance" blocks={[240, 380, 130]} />;
}
