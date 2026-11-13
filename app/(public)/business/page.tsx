import type { Metadata } from "next";
import { BusinessShell } from "@/components/public/business/BusinessShell";
import { BUSINESS_HERO } from "@/lib/public-site/business-content";

export const metadata: Metadata = {
  title: "For Businesses",
  description: BUSINESS_HERO.body,
};

/**
 * /business: "For Businesses" (Business-Desktop / Business-Mobile.dc.html).
 * Fully static (no searchParams / data fetch), so this route's own
 * loading.tsx is never skipped in favour of a parent skeleton.
 */
export default function BusinessPage() {
  return <BusinessShell />;
}
