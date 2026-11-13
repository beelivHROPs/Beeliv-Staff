import { SentPanel } from "@/components/public/auth/SentPanel";

// Loading frame: the real screen rendered in the shared `.skel` treatment
// (text and media swapped for soft shimmer blocks; rules in ../../public-site.css,
// auth additions in ../auth.css). Same mechanism as Home's skeleton, this
// screen's own layout.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <SentPanel email={null} skeleton />
    </div>
  );
}
