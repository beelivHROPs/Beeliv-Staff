import type { Metadata } from "next";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { AccessDenied } from "@/components/public/auth/AccountStatusPages";
export const metadata: Metadata = { title: "No access", robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <AuthStandalone>
      <AccessDenied portal="client" available={(await searchParams).available} />
    </AuthStandalone>
  );
}
