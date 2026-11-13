import "./training.css";

// /training lives under the (public) route group, so it inherits the scoped
// public-site tokens, Newsreader and MotionRoot from app/(public)/layout.tsx.
// This nested layout only adds the page-specific accordion styles (see
// ./training.css).
export default function TrainingLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
