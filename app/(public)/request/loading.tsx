import { RequestShell } from "@/components/public/request/RequestShell";
import { RequestFormSkeleton } from "@/components/public/request/RequestFormSkeleton";

// Loading skeleton for /request (Skel-Request-Desktop / -Mobile.dc.html): the
// whole page inside `.skel` (styles in ../public-site.css), form area in its
// step-2 layout.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <RequestShell>
        <RequestFormSkeleton />
      </RequestShell>
    </div>
  );
}
