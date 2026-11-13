import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FLOW_TEST_ONLY } from "@/lib/public-site/auth";
import { VerifyEmailPanel } from "@/components/public/auth/VerifyEmailPanel";
import { isValidEmail, normaliseEmail } from "@/lib/public-site/auth-rules";

// DERIVED FROM THE AUTH FRAME: no wireframe board exists for this screen.
// The address is in the URL (?email=), so keep it out of search indexes and
// out of Referer headers.
export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // No email is ever sent until the backend exists: this "check your email / password changed" screen would be a fake success.
  if (!FLOW_TEST_ONLY) notFound();
  const raw = (await searchParams).email;
  const candidate = typeof raw === "string" ? normaliseEmail(raw) : "";
  // Only ever echo something that is a well-formed address.
  return <VerifyEmailPanel email={isValidEmail(candidate) ? candidate : null} />;
}
