import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Phone top-bar control (Applicant + Staff). A soft round 40px circle (tint fill, no border) with a transparent
 * 48px touch area. Themed through the --ap-* variables so dark mode follows the app. `topbarCircle` is also passed
 * to GlobalSearchButton (className) so the search circle matches exactly.
 */
export const topbarCircle =
  "relative inline-flex size-[42px]! shrink-0 items-center justify-center rounded-full! border! border-(--ap-line)! bg-(--ap-surface,#fff)! text-(--ap-ink-2) shadow-none! hover:bg-(--ap-tint)! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet) before:absolute before:-inset-[3px] before:content-[''] [&_svg]:size-5";

export function TopbarBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bv-badge absolute -top-1 -right-1" aria-hidden="true">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function TopbarLink({ href, label, badge = 0, children }: { href: string; label: string; badge?: number; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className={topbarCircle}>
      {children}
      <TopbarBadge count={badge} />
    </Link>
  );
}
