import type { Metadata } from "next";
import { TrainingBody } from "@/components/public/training/TrainingBody";
import { TRAINING_HERO } from "@/lib/public-site/training-content";

export const metadata: Metadata = {
  title: "Training & Services",
  description: TRAINING_HERO.body,
};

/**
 * /training (Training-Desktop.dc.html / Training-Mobile.dc.html): entirely
 * static content (no data fetching), so page.tsx and loading.tsx render the
 * exact same TrainingBody - loading.tsx just wraps it in `.skel`, same
 * pattern as JobDetailBody (components/public/JobDetail.tsx).
 */
export default function TrainingPage() {
  return <TrainingBody />;
}
