import type { Metadata } from "next";
import { newsreader } from "@/components/applicant/fonts";
import { RowClick } from "@/components/admin/RowClick";
import { ADMIN_ROLE_CLASS } from "@/components/admin/nav";
import { demoAttr } from "@/lib/dev-demo-flag";
import "../applicant/applicant.css";
import { ScreenScale } from "@/components/shared/ScreenScale";
import "./admin.css";

// Beeliv Admin (HR first): an internal, invitation-only workspace (NO public
// sign-up). Same shell as the Applicant / Staff / Client apps with its own
// role identity applied by tokens (admin.css). Production target:
// admin.beeliv.co (HR + Operations); built at /admin in this repo for now.
// Admin authentication is built later; nothing here is access control.
export const metadata: Metadata = {
  title: { default: "Overview", template: "%s | Beeliv Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div {...demoAttr()} className={`ap-screen-zoom applicant-shell admin-theme ${ADMIN_ROLE_CLASS} ${newsreader.variable}`}>
      <ScreenScale />
      {/* Reveals start hidden in the server HTML; without JS, show them. */}
      <noscript>
        <style>{`.applicant-shell [data-ap-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>
      <RowClick />
      {children}
    </div>
  );
}
