import type { Metadata } from "next";
import { NotificationsBody } from "@/components/admin/notifications/NotificationsBody";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsBody />;
}
