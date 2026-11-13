import { ResetSuccessPanel } from "@/components/public/auth/ResetSuccessPanel";

// Loading frame: the real screen rendered in the shared `.skel` treatment
// (rules in ../../../public-site.css, auth additions in ../../auth.css).
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <ResetSuccessPanel skeleton />
    </div>
  );
}
