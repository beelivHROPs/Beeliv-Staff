import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FLOW_TEST_ONLY } from "@/lib/public-site/auth";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { SentPanel } from "@/components/public/auth/SentPanel";
import { isValidEmail, normaliseEmail } from "@/lib/public-site/auth-rules";
export const metadata: Metadata = { title: "Check your email", robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // No email is ever sent until the backend exists: this "check your email / password changed" screen would be a fake success.
  if (!FLOW_TEST_ONLY) notFound();
  const raw = (await searchParams).email;
  const candidate = typeof raw === "string" ? normaliseEmail(raw) : "";
  return (
    <AuthStandalone>
      <SentPanel portal="client" email={isValidEmail(candidate) ? candidate : null} />
    </AuthStandalone>
  );
}
