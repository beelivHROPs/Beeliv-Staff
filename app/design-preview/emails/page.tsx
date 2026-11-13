import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { EmailPreview } from "@/components/design-preview/emails/EmailPreview";

// Dev-only preview of the draft email templates (docs/contracts/email-templates). Not linked, never indexed, 404 in production.
export const metadata: Metadata = {
  title: "Design preview: Emails",
  robots: { index: false, follow: false },
};

// Sample values only. Real values come from the server; sender and reply addresses are placeholders until Beeliv supplies them.
const SAMPLE: Record<string, string> = {
  firstName: "Amaka",
  buttonUrl: "#",
  expiryDays: "7",
  linkLifetime: "1 hour",
  changedAt: "13 Oct 2026, 5:45 PM (WAT)",
  supportEmail: "support@example.invalid",
  senderName: "Beeliv Hospitality",
  senderAddress: "sender@example.invalid",
  replyTo: "reply@example.invalid",
  logoWhiteUrl: "/images/beeliv-logo-white.png",
  jobTitle: "Front of House Supervisor",
  statusLine: "Your application has moved to the next step.",
  interviewDate: "Tuesday 27 Oct 2026",
  interviewTime: "10:30 AM WAT",
  interviewMethod: "In person",
  interviewPlace: "Sample address, Abuja",
  reminderLead: "24 hours",
  documentName: "your ID document",
  agreementName: "Staff Handbook",
  reference: "BLV-SAMPLE-0001",
  enquiryType: "Contact",
  count: "3",
  days: "2",
  jobCount: "4",
  originalSubject: "Your question about training",
  replyText: "Thank you for getting in touch.\n\nWe would be glad to talk through the options. Is Thursday morning a good time for a short call?",
  unsubscribeUrl: "#",
  signedInAt: "19 Oct 2026, 9:12 AM WAT",
  approxPlace: "Abuja, Nigeria",
};

const LABEL: Record<string, string> = {
  "invitation-client": "Invitation: client",
  "invitation-staff": "Invitation: staff",
  "invitation-admin": "Invitation: admin",
  "invitation-resend": "Invitation: resend",
  "verify-email": "Verify email",
  "password-reset": "Password reset",
  "password-changed": "Password changed",
  "application-received": "Application received",
  "application-status-update": "Application status update",
  "interview-scheduled": "Interview scheduled",
  "interview-changed": "Interview changed",
  "interview-cancelled": "Interview cancelled",
  "interview-reminder": "Interview reminder",
  "document-request": "Document request",
  "document-verified": "Document verified",
  "offer-available": "Offer available",
  "agreement-reacceptance": "Agreement re-acceptance",
  "welcome-after-setup": "Welcome after setup",
  "enquiry-receipt": "Enquiry receipt",
  "enquiry-internal-alert": "Enquiry alert (internal)",
  "approval-waiting": "Approval waiting",
  "inbox-reply": "Inbox reply",
  "job-alert": "Job alert (optional)",
  "security-new-signin": "Security: new sign-in",
};

export default async function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const dir = path.join(process.cwd(), "docs", "contracts", "email-templates");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".html")).sort();
  const items = await Promise.all(
    files.map(async (f) => {
      const id = f.replace(/\.html$/, "");
      let html = await readFile(path.join(dir, f), "utf8");
      html = html.replace(/\{\{(\w+)\}\}/g, (_, k: string) => SAMPLE[k] ?? `{{${k}}}`);
      return { id, label: LABEL[id] ?? id, html };
    }),
  );
  return <EmailPreview items={items} />;
}
