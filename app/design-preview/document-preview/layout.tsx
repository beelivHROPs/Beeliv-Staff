import type { Metadata } from "next";
import { newsreader } from "@/components/applicant/fonts";
import { demoAttr } from "@/lib/dev-demo-flag";
import "../../applicant/applicant.css";

// Dev-only design preview. Not linked from anywhere, never indexed. `data-bv-demo` turns the
// browser-only demo file store on for this page only (remove with the other demo fixtures).
export const metadata: Metadata = {
  title: "Design preview: Document frame",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div {...demoAttr()} className={`applicant-shell min-h-dvh ${newsreader.variable}`}>
      {children}
    </div>
  );
}
