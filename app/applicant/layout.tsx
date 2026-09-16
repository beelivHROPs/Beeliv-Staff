import { AppShell } from "@/components/layout/AppShell";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/nav-config";
import { SAMPLE_APPLICATION_ACTIVITY } from "@/lib/placeholder-data";

// Same list app/applicant/notifications renders — the bell badge is this
// array's length (3), not the previously-hardcoded, disconnected 2.
const notifications = SAMPLE_APPLICATION_ACTIVITY.map((item, i) => ({
  id: `activity-${i}`,
  title: item.title,
  date: item.date,
}));

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
      notifications={notifications}
    >
      {/* applicant-scope — lets globals.css add a drop shadow to every Card
          on the applicant side only (project-lead, 2026-09-16: "add some
          dropshadows to the cards / for applicant only"), without touching
          the shared Card component (used by every other role/dashboard) or
          editing each individual call site across app/applicant + components/
          applicant. */}
      <div className="applicant-scope contents">{children}</div>
    </AppShell>
  );
}
