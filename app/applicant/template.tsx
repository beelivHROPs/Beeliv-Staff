import { ViewTransition } from "react";

/**
 * Re-mounts on every applicant route change (Next.js template convention).
 *
 * Page navigation motion: React's <ViewTransition> (browser View Transitions
 * API) — the old page settles back and fades while the new page pops up into
 * place. The sidebar/top bar live in the layout, outside this wrapper, so
 * they stay still. CSS: "Page navigation" in applicant.css. Browsers without
 * View Transitions get the `.ap-page` fade-up instead.
 */
export default function ApplicantTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="ap-nav-in" exit="ap-nav-out" default="none">
      <div className="ap-page">{children}</div>
    </ViewTransition>
  );
}
