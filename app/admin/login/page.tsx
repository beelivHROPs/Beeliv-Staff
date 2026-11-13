import type { Metadata } from "next";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { LoginForm, type LoginPreview } from "@/components/public/auth/LoginForm";
import { safeNextPath } from "@/lib/auth/portals";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

const PREVIEWS: readonly LoginPreview[] = ["wrong", "unverified", "limited", "error", "session-expired"];

// Beeliv Admin sign-in: its own page on its own address. Mock auth (lib/auth/mock.ts).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const preview = PREVIEWS.find((p) => p === sp.state) ?? null;
  return (
    <AuthStandalone>
      <LoginForm portal="admin" next={safeNextPath(sp.next)} preview={preview} />
    </AuthStandalone>
  );
}
