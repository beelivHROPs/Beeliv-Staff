import type { Metadata } from "next";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { ForgotForm } from "@/components/public/auth/ForgotForm";
export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const state = (await searchParams).state;
  return (
    <AuthStandalone>
      <ForgotForm portal="admin" previewLimited={state === "limited"} />
    </AuthStandalone>
  );
}
