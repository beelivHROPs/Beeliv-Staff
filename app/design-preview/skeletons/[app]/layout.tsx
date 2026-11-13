import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { newsreader } from "@/components/applicant/fonts";
import { AppShell } from "@/components/applicant/AppShell";
import { AdminShell } from "@/components/admin/AdminShell";
import { ClientShell } from "@/components/client/ClientShell";
import { StaffShell } from "@/components/staff/StaffShell";
import { ADMIN_ROLE_CLASS } from "@/components/admin/nav";
import { PilotMenuProvider } from "@/lib/pilot/context";
import "../../../applicant/applicant.css";
import "../../../applicant/applicant-buttons.css";
import "../../../admin/admin.css";
import "../../../client/client.css";
import "../../../staff/staff.css";

// DEV ONLY. Shows each loading skeleton inside the SAME shell + theme wrapper as the real route, so its position
// and size can be compared with the loaded page. Returns 404 in production builds.
export const metadata: Metadata = { title: "Design preview: skeletons", robots: { index: false, follow: false } };

const THEME: Record<string, string> = {
  applicant: "",
  admin: `admin-theme ${ADMIN_ROLE_CLASS}`,
  client: "client-theme",
  staff: "staff-theme",
};

export default async function SkeletonPreviewLayout({ children, params }: { children: React.ReactNode; params: Promise<{ app: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { app } = await params;
  if (!(app in THEME) && app !== "public") notFound();
  if (app === "public") return <>{children}</>;
  const shell =
    app === "applicant" ? <AppShell>{children}</AppShell> : (
      <PilotMenuProvider on={false} devSwitch={false}>
        {app === "admin" ? <AdminShell>{children}</AdminShell> : app === "client" ? <ClientShell>{children}</ClientShell> : <StaffShell>{children}</StaffShell>}
      </PilotMenuProvider>
    );
  return (
    <div className={`${app === "applicant" ? "ap-app " : ""}ap-screen-zoom applicant-shell ${THEME[app]} ${newsreader.variable}`}>{shell}</div>
  );
}
