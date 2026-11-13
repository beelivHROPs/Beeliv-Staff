import type { Metadata } from "next";
import { CandidateDetailBody } from "@/components/client/recruitment/CandidateDetailBody";

export const metadata: Metadata = { title: "Candidate" };

export default async function Page({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  return <CandidateDetailBody id={candidateId} />;
}
