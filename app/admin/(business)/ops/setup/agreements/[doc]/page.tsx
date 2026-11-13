import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgreementEditor } from "@/components/admin/ops/agreements/AgreementEditor";
import { AGREEMENT_IDS, isAgreementId } from "@/lib/admin/agreements/ids";

export const metadata: Metadata = { title: "Agreement" };

export function generateStaticParams() {
  return AGREEMENT_IDS.map((doc) => ({ doc }));
}

export default async function AgreementPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isAgreementId(doc)) notFound();
  return <AgreementEditor id={doc} />;
}
