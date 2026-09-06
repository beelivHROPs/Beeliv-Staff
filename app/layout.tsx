import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

// Inter remains the body/UI face (nav, forms, tables, metrics) per the
// current implementation brief. Manrope is layered in as the dedicated
// heading face (h1/h2, PageHeading) — supersedes docs/architecture/
// design-system.md's PROPOSED Fraunces heading pairing; that doc still
// needs updating to reflect this decision.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Beeliv HR/Ops",
    template: "%s | Beeliv",
  },
  description:
    "Beeliv Hospitality HR, Recruitment & Operations platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
