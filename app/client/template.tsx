import { ViewTransition } from "react";

/** Re-mounts on every Client route change; same page-navigation motion as the Applicant / Staff areas. */
export default function ClientTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="ap-nav-in" exit="ap-nav-out" default="none">
      <div className="ap-page">{children}</div>
    </ViewTransition>
  );
}
