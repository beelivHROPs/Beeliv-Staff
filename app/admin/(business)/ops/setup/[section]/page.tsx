import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSetupSlug } from "@/components/admin/ops/setup/meta";
import { SetupSection } from "@/components/admin/ops/setup/SetupSection";

export const metadata: Metadata = { title: "Setup" };

export default async function SetupSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSetupSlug(section)) notFound();
  return <SetupSection slug={section} />;
}
