import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FLOW_TEST_ONLY } from "@/lib/public-site/auth";
import { ResetSuccessPanel } from "@/components/public/auth/ResetSuccessPanel";

// DERIVED FROM THE AUTH FRAME: no wireframe board exists for this screen.
export const metadata: Metadata = {
  title: "Password reset",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetSuccessPage() {
  // No email is ever sent until the backend exists: this "check your email / password changed" screen would be a fake success.
  // Password recovery is live once the auth backend is configured; before that this screen would be a fake success.
  if (!FLOW_TEST_ONLY && process.env.AUTH_BACKEND_ENABLED !== "true") notFound();
  return <ResetSuccessPanel />;
}
