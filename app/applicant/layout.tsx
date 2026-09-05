import { AppShell } from "@/components/layout/AppShell";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/nav-config";

export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      roleLabel={ROLE_LABELS.applicant}
      navItems={NAV_ITEMS.applicant}
      userName="Amaka Okoye"
      showSearch
      notificationCount={2}
    >
      {children}
    </AppShell>
  );
}
