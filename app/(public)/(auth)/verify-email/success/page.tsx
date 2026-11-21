import type { Metadata } from "next";
import { VerifiedPanel } from "@/components/public/auth/VerifiedPanel";

// DERIVED FROM THE AUTH FRAME: no wireframe board exists for this screen.
// The emailed confirmation link lands here carrying a one-time credential: no
// indexing, no Referer leak (the credential is also scrubbed from the URL on load).
export const metadata: Metadata = {
  title: "Email verified",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function VerifiedPage() {
  return <VerifiedPanel />;
}
