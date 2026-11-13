import type { Metadata } from "next";
import { AssessmentsList } from "@/components/admin/assessments/AssessmentsList";

export const metadata: Metadata = { title: "Assessments" };

export default function Page() {
  return <AssessmentsList />;
}
