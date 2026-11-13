import type { Metadata } from "next";
import { newsreader } from "@/components/applicant/fonts";
import "@/components/design-preview/applicant-home/applicant-home.css";

// Dev-only design preview. Not linked from anywhere, never indexed.
export const metadata: Metadata = {
  title: "Design preview: Applicant Home",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className={`dp-root ${newsreader.variable}`}>{children}</div>;
}
