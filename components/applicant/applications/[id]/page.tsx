import { ApplicationDetailBody } from "@/components/applicant/ApplicationDetailBody";

type Params = Promise<{ id: string }>;

export default async function ApplicantApplicationDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  // Application data now lives in the client-side mock store (service.ts) —
  // lookup, the draft redirect and the not-found state are all handled
  // inside this client component. See ApplyBody's header comment for why
  // (localStorage-backed draft continuity has no server-side equivalent yet).
  return <ApplicationDetailBody applicationId={id} />;
}
