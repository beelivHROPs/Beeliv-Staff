import type { Metadata } from "next";
import { RequestShell } from "@/components/public/request/RequestShell";
import { RequestWizard } from "@/components/public/request/RequestWizard";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Static on purpose: a generateMetadata that reads searchParams suspends above
// this route's own loading.tsx, so the parent (Home) skeleton would flash.
export const metadata: Metadata = {
  title: "Request talent",
  description:
    "Share a few details and a Beeliv representative will contact you to discuss your requirements.",
};

/**
 * /request         = the four-step "what do you need" form.
 * /request?need=x  = preselects a step-2 card (recruitment | training | systems |
 *                    audit); anything else is ignored. Home's "Book a Service
 *                    Audit" CTAs link here.
 * /request?from=signup arrives from Sign up's "Hire talent" redirect. The
 * wireframe draws no variant for it, so it is deliberately ignored.
 */
export default async function RequestPage({ searchParams }: { searchParams: SearchParams }) {
  const need = (await searchParams).need;
  return (
    <RequestShell>
      <RequestWizard need={typeof need === "string" ? need : undefined} />
    </RequestShell>
  );
}
