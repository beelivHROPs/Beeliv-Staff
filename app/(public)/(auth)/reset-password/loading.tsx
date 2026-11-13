import { ResetPasswordForm } from "@/components/public/auth/ResetPasswordForm";

// Loading frame: the real screen rendered in the shared `.skel` treatment
// (text and media swapped for soft shimmer blocks; rules in ../../public-site.css,
// auth additions in ../auth.css). This screen's own layout.
export default function Loading() {
  return (
    <div className="skel" aria-busy="true" aria-label="Loading">
      <ResetPasswordForm skeleton />
    </div>
  );
}
