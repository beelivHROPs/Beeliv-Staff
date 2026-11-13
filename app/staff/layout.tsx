import type { Metadata } from "next";
import { newsreader } from "@/components/applicant/fonts";
import { demoAttr } from "@/lib/dev-demo-flag";
import "../applicant/applicant.css";
import { ScreenScale } from "@/components/shared/ScreenScale";
import "./staff.css";

// Staff Hub: one Talent app with the Applicant area - same shell, same
// person and session; Staff is an ENTITLEMENT with its own Indigo-Violet
// identity applied by tokens (staff.css). Fonts: Karla (global) + Newsreader.
// No staff login/signup lives here: the shared /login is the only sign-in.
export const metadata: Metadata = {
  title: { default: "Staff Hub", template: "%s | Beeliv Staff" },
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: LayoutProps<"/">) {
  return (
    <div {...demoAttr()} className={`ap-screen-zoom applicant-shell staff-theme ${newsreader.variable}`}>
      <ScreenScale />
      {/* Reveals start hidden in the server HTML; without JS, show them. */}
      <noscript>
        <style>{`.applicant-shell [data-ap-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>
      {children}
    </div>
  );
}
