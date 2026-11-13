import type { Metadata } from "next";
import { RecruitmentBody } from "@/components/client/recruitment/RecruitmentBody";
import { CANDIDATE_FILTERS } from "@/components/client/recruitment/filters";

export const metadata: Metadata = { title: "Recruitment / Candidates" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const initial = CANDIDATE_FILTERS.find((f) => f === status) ?? "all";
  return <RecruitmentBody key={initial} initialFilter={initial} />;
}
