import type { Metadata } from "next";
import { RequestSent } from "@/components/public/request/RequestSent";

export const metadata: Metadata = { title: "Request received" };

export default function RequestSentPage() {
  return <RequestSent />;
}
