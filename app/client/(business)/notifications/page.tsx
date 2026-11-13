import type { Metadata } from "next";
import { NotificationsBody } from "@/components/client/notifications/NotificationsBody";

export const metadata: Metadata = { title: "Notifications" };

export default function ClientNotificationsPage() {
  return <NotificationsBody />;
}
