import type { Metadata } from "next";
import { AssignmentBody } from "@/components/staff/assignment/AssignmentBody";

export const metadata: Metadata = { title: "My Assignment" };

export default function Page() {
  return <AssignmentBody />;
}
