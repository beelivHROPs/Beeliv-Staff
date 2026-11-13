import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/public/auth/ResetPasswordForm";
import { parseFlowTestState } from "@/lib/public-site/auth";

// DERIVED FROM THE AUTH FRAME: no wireframe board exists for this screen.
// The emailed reset link lands here carrying a one-time credential: no
// indexing, no Referer leak (the credential is also scrubbed from the URL on load).
export const metadata: Metadata = {
  title: "Create a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Flow-test preview only (?state=expired|invalid); null once a backend is connected.
  const raw = (await searchParams).state;
  const previewState = parseFlowTestState(raw);
  // ?state=used (mock preview, same switch-off rule): an already-used link.
  const previewUsed = previewState === null && raw === "used" && parseFlowTestState("invalid") !== null;
  return <ResetPasswordForm previewState={previewState} previewUsed={previewUsed} />;
}
