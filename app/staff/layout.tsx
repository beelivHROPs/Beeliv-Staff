import { AppShell } from "@/components/layout/AppShell";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/nav-config";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      roleLabel={ROLE_LABELS.staff}
      navItems={NAV_ITEMS.staff}
      userName="Tobi Adewale"
      notificationCount={1}
      navTone="lavender"
    >
      {children}
    </AppShell>
  );
}
