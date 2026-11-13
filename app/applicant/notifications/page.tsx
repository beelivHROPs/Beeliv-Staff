import type { Metadata } from "next";
import { NotificationsBody } from "@/components/applicant/NotificationsBody";

export const metadata: Metadata = { title: "Notifications" };

export default function ApplicantNotificationsPage() {
  return <NotificationsBody />;
}
