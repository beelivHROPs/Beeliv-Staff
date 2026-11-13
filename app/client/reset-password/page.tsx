import type { Metadata } from "next";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { ResetPasswordForm } from "@/components/public/auth/ResetPasswordForm";
import { parseFlowTestState } from "@/lib/public-site/auth";
export const metadata: Metadata = { title: "Create a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).state;
  const previewState = parseFlowTestState(raw);
  const previewUsed = previewState === null && raw === "used" && parseFlowTestState("invalid") !== null;
  return (
    <AuthStandalone>
      <ResetPasswordForm portal="client" previewState={previewState} previewUsed={previewUsed} />
    </AuthStandalone>
  );
}
