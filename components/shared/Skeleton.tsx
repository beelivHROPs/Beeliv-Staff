export function Skeleton({
  className = "",
  inverse = false,
}: {
  className?: string;
  /** For skeleton blocks sitting on a solid brand-color surface (e.g. the
   *  purple job-listing cards) — white/translucent sweep instead of the
   *  default gray, so it reads as "this purple card is loading" rather than
   *  a mismatched plain card. */
  inverse?: boolean;
}) {
  return (
    <div
      className={`${inverse ? "animate-shimmer-inverse motion-reduce:bg-white/30" : "animate-shimmer motion-reduce:bg-muted"} motion-reduce:animate-none rounded-md ${className}`}
    />
  );
}
