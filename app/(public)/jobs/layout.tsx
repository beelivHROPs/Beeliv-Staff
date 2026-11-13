import "./jobs.css";

// /jobs lives under the (public) route group, so it inherits the scoped
// public-site tokens, Newsreader and MotionRoot from app/(public)/layout.tsx.
// This nested layout only adds the jobs-page-specific styles (filter pills,
// search fields, active-filter chips - see ./jobs.css).
export default function JobsLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
