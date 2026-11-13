import "./about.css";

// /about lives under the (public) route group, so it inherits the scoped
// public-site tokens, Newsreader and MotionRoot from app/(public)/layout.tsx.
// This nested layout only adds the about-page-specific styles (mirrored
// sculpt curve, team portrait shape - see ./about.css).
export default function AboutLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
