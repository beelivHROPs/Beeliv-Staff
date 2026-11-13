import type { Metadata } from "next";
import { PublishedPolicies } from "@/components/admin/ops/agreements/PublishedPolicies";

export const metadata: Metadata = { title: "Agreements and policies" };

export default function PoliciesPage() {
  return <PublishedPolicies />;
}
