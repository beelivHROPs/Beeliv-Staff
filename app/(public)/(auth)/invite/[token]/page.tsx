import type { Metadata } from "next";
import { InviteLoader } from "@/components/public/auth/InviteLoader";
import { authMode } from "@/lib/auth/mode";

// The path carries a one-time invitation token: never index it, never leak it
// through the Referer header.
export const metadata: Metadata = {
  title: "Accept your invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  // The browser loads the preview (typed service when the backend is enabled,
  // development fixtures otherwise). Shared /invite route = Talent app (staff invitations).
  return (
    <InviteLoader
      token={token}
      routePortal="talent"
      mode={authMode()}
      demo={one(query.demo)}
      previewState={one(query.state)}
    />
  );
}
