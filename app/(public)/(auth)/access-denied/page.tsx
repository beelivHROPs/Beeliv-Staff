import type { Metadata } from "next";
import { AccessDenied } from "@/components/public/auth/AccountStatusPages";

export const metadata: Metadata = { title: "No access", robots: { index: false, follow: false } };

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <AccessDenied available={(await searchParams).available} />;
}
