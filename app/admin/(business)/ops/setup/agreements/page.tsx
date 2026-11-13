import type { Metadata } from "next";
import { AgreementsList } from "@/components/admin/ops/agreements/AgreementsList";

export const metadata: Metadata = { title: "Agreements and policies" };

export default function AgreementsPage() {
  return <AgreementsList />;
}
