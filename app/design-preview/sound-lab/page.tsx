import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SoundLab } from "@/components/design-preview/sound-lab/SoundLab";
import "@/components/design-preview/sound-lab/sound-lab.css";

// Dev-only design preview of the proposed sound identity. Not linked from anywhere, never indexed, 404 in production.
export const metadata: Metadata = {
  title: "Design preview: Sound Lab",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SoundLab />;
}
