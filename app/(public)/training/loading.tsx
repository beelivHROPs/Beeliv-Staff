import { TrainingBody } from "@/components/public/training/TrainingBody";

// Loading skeleton for /training (Skel-Training-Desktop / Skel-Training-
// Mobile.dc.html): the same DOM as the real page, wrapped in `.skel`
// (styles in ../public-site.css) - there is no dynamic data on this page, so
// TrainingBody is reused as-is rather than duplicated.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <TrainingBody />
    </div>
  );
}
