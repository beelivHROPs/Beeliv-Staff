import { ViewTransition } from "react";

/** Re-mounts on every Staff route change; same page-navigation motion as the Applicant area. */
export default function StaffTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="ap-nav-in" exit="ap-nav-out" default="none">
      <div className="ap-page">{children}</div>
    </ViewTransition>
  );
}
