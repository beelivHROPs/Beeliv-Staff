import { AppShell } from "@/components/layout/AppShell";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/nav-config";
import { SAMPLE_STAFF_NOTICES } from "@/lib/placeholder-data";

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
      notifications={SAMPLE_STAFF_NOTICES}
      navTone="lavender"
    >
      {children}
    </AppShell>
  );
}
