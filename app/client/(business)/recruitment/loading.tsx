import { PageSkeleton } from "@/components/client/recruitment/states";

export default function Loading() {
  return <PageSkeleton title="Recruitment / Candidates" label="Loading recruitment" blocks={[180, 420]} />;
}
