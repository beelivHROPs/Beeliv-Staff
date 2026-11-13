import { HomeBody } from "@/components/public/HomeBody";
import { SKELETON_JOBS } from "@/lib/public-site/jobs";

// Loading skeleton for Home (Skel-Main / Skel-Home-Desktop-2 /
// Skel-Home-Mobile / Skel-Home-Mobile-2 boards). The boards are the page
// layout with text and media swapped for soft shimmering blocks, so this
// renders the same sections inside `.skel` (styles in ../public-site.css).
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <HomeBody jobs={SKELETON_JOBS} skeleton />
    </div>
  );
}
