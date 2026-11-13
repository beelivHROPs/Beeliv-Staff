import { PageSkeleton } from "@/components/client/recruitment/states";

export default function Loading() {
  return <PageSkeleton title="Workforce Requests" label="Loading requests" blocks={[110, 380]} />;
}
