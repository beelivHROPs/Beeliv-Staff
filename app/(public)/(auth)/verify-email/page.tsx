import type { Metadata } from "next";
import { VerifyEmailEntry } from "@/components/public/auth/VerifyEmailEntry";
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
  const raw = (await searchParams).email;
  const candidate = typeof raw === "string" ? normaliseEmail(raw) : "";
  // Only ever echo something that is a well-formed address.
  return <VerifyEmailEntry email={isValidEmail(candidate) ? candidate : null} />;
}
