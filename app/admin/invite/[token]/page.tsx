import type { Metadata } from "next";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { InviteLoader } from "@/components/public/auth/InviteLoader";
import { authMode } from "@/lib/auth/mode";
export const metadata: Metadata = { title: "Accept your invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  return (
    <AuthStandalone>
      <InviteLoader
        token={token}
        routePortal="admin"
        mode={authMode()}
        demo={one(query.demo)}
        previewState={one(query.state)}
      />
    </AuthStandalone>
  );
}
