import { BusinessShell } from "@/components/public/business/BusinessShell";

// Loading skeleton for /business (Skel-Business-Desktop / Skel-Business-Mobile
// boards): same DOM as the real page - `.skel` (app/(public)/public-site.css)
// swaps text for shimmering blocks and media for flat tiles.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <BusinessShell />
    </div>
  );
}
