import type { Metadata } from "next";
import { AccountSuspended } from "@/components/public/auth/AccountStatusPages";

export const metadata: Metadata = { title: "Account not active", robots: { index: false, follow: false } };

export default function AccountSuspendedPage() {
  return <AccountSuspended />;
}
