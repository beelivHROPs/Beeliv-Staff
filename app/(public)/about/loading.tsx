import { AboutBody } from "@/components/public/about/AboutBody";

// Loading skeleton for /about (Skel-About-Desktop / Skel-About-Mobile.dc.html):
// the boards are the exact same page layout with text/media swapped for soft
// shimmering blocks, so this renders the same static AboutBody inside `.skel`
// (styles in ../public-site.css) - same technique as (home)/loading.tsx.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <AboutBody />
    </div>
  );
}
