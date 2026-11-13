import type { Metadata } from "next";
import { newsreader } from "@/components/applicant/fonts";
import { demoAttr } from "@/lib/dev-demo-flag";
import "../applicant/applicant.css";
import { ScreenScale } from "@/components/shared/ScreenScale";
import "./client.css";

// Beeliv Client: an invited business/outlet oversight workspace (invitation
// only, NO public sign-up). Same shell as the Applicant / Staff apps with its
// own Warm Plum identity applied by tokens (client.css). Fonts: Karla (global)
// + Newsreader, the same pair as the public site. Production target:
// client.beeliv.co; built at /client in this repo for now.
export const metadata: Metadata = {
  title: { default: "Overview", template: "%s | Beeliv Client" },
  robots: { index: false, follow: false },
};

export default function ClientLayout({ children }: LayoutProps<"/">) {
  return (
    <div {...demoAttr()} className={`ap-screen-zoom applicant-shell client-theme ${newsreader.variable}`}>
      <ScreenScale />
      {/* Reveals start hidden in the server HTML; without JS, show them. */}
      <noscript>
        <style>{`.applicant-shell [data-ap-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>
      {children}
    </div>
  );
}
