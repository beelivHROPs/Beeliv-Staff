import type { Metadata } from "next";
import { OverviewBody } from "@/components/client/overview/OverviewBody";

export const metadata: Metadata = { title: "Overview" };

export default function ClientOverviewPage() {
  return <OverviewBody />;
}
