import type { Metadata } from "next";
import { AuthStandalone } from "@/components/public/auth/AuthStandalone";
import { AccountSuspended } from "@/components/public/auth/AccountStatusPages";
export const metadata: Metadata = { title: "Account not active", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthStandalone>
      <AccountSuspended portal="admin" />
    </AuthStandalone>
  );
}
