import { ViewTransition } from "react";

/** Re-mounts on every Admin route change; same page-navigation motion as the other apps. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="ap-nav-in" exit="ap-nav-out" default="none">
      <div className="ap-page">{children}</div>
    </ViewTransition>
  );
}
