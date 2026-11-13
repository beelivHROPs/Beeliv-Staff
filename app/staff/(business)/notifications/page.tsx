import type { Metadata } from "next";
import { NotificationsBody } from "@/components/staff/notifications/NotificationsBody";

export const metadata: Metadata = { title: "Notifications" };

export default function StaffNotificationsPage() {
  return <NotificationsBody />;
}
