import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FLOW_TEST_ONLY } from "@/lib/public-site/auth";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { ResetSuccessPanel } from "@/components/public/auth/ResetSuccessPanel";
export const metadata: Metadata = { title: "Password reset", robots: { index: false, follow: false } };

export default function Page() {
  // No email is ever sent until the backend exists: this "check your email / password changed" screen would be a fake success.
  if (!FLOW_TEST_ONLY) notFound();
  return (
    <AuthStandalone>
      <ResetSuccessPanel portal="client" />
    </AuthStandalone>
  );
}
